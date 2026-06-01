from pydantic import BaseModel

from app.schemas.customer import CustomerRead
from app.schemas.order import OrderRead
from app.schemas.product import ProductRead


class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_products: list[ProductRead]


class AppBootstrap(BaseModel):
    products: list[ProductRead]
    customers: list[CustomerRead]
    orders: list[OrderRead]
    dashboard: DashboardSummary
