from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.customer import Customer
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.customer import CustomerRead
from app.schemas.dashboard import AppBootstrap, DashboardSummary
from app.schemas.order import OrderCreate, OrderRead
from app.schemas.product import ProductRead
from app.services.orders import create_order


router = APIRouter()


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order_endpoint(payload: OrderCreate, db: Session = Depends(get_db)) -> Order:
    return create_order(db, payload)


@router.get("", response_model=list[OrderRead])
def list_orders(db: Session = Depends(get_db)) -> list[Order]:
    return (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.id.desc())
        .all()
    )


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    low_stock_products = (
        db.query(Product).filter(Product.quantity_in_stock <= 5).order_by(Product.quantity_in_stock.asc()).all()
    )
    return DashboardSummary(
        total_products=db.query(Product).count(),
        total_customers=db.query(Customer).count(),
        total_orders=db.query(Order).count(),
        low_stock_products=[ProductRead.model_validate(product) for product in low_stock_products],
    )


@router.get("/bootstrap", response_model=AppBootstrap)
def bootstrap_workspace(db: Session = Depends(get_db)) -> AppBootstrap:
    products = db.query(Product).order_by(Product.id.desc()).all()
    customers = db.query(Customer).order_by(Customer.id.desc()).all()
    orders = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.id.desc())
        .all()
    )
    low_stock_products = [product for product in products if product.quantity_in_stock <= 5]

    return AppBootstrap(
        products=[ProductRead.model_validate(product) for product in products],
        customers=[CustomerRead.model_validate(customer) for customer in customers],
        orders=[OrderRead.model_validate(order) for order in orders],
        dashboard=DashboardSummary(
            total_products=len(products),
            total_customers=len(customers),
            total_orders=len(orders),
            low_stock_products=[ProductRead.model_validate(product) for product in low_stock_products],
        ),
    )


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)) -> Order:
    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)) -> None:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    db.delete(order)
    db.commit()
