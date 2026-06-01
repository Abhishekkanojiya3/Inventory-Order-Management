from sqlalchemy import CheckConstraint, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (CheckConstraint("quantity_in_stock >= 0", name="ck_products_quantity_non_negative"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    quantity_in_stock: Mapped[int] = mapped_column(nullable=False, default=0)

    order_items = relationship("OrderItem", back_populates="product")
