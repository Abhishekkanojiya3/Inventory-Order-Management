from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.order import OrderCreate


def create_order(db: Session, payload: OrderCreate) -> Order:
    customer = db.get(Customer, payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    product_ids = [item.product_id for item in payload.items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).with_for_update().all()
    product_map = {product.id: product for product in products}

    missing_ids = sorted(set(product_ids) - set(product_map))
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product(s) not found: {', '.join(map(str, missing_ids))}",
        )

    order = Order(customer_id=payload.customer_id, status=OrderStatus.CREATED.value, total_amount=0)
    total = Decimal("0")

    for requested_item in payload.items:
        product = product_map[requested_item.product_id]
        if product.quantity_in_stock < requested_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient inventory for SKU {product.sku}",
            )

        unit_price = Decimal(str(product.price))
        line_total = unit_price * requested_item.quantity
        total += line_total
        product.quantity_in_stock -= requested_item.quantity
        order.items.append(
            OrderItem(
                product_id=product.id,
                quantity=requested_item.quantity,
                unit_price=unit_price,
                line_total=line_total,
            )
        )

    order.total_amount = total
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
