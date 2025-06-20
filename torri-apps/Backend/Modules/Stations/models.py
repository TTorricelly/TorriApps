from uuid import uuid4
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from Config.Database import Base


class StationType(Base):
    """
    Describes the kind of resource a service needs.
    Examples: hair_chair, mani_table, pedi_chair, spa_room
    """
    __tablename__ = "station_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    code = Column(String(50), nullable=False, unique=True, index=True)  # 'hair_chair'
    name = Column(String(100), nullable=False)  # 'Cadeira de Corte'

    # Relationships
    stations = relationship("Station", back_populates="station_type", cascade="all, delete-orphan")
    service_requirements = relationship("ServiceStationRequirement", back_populates="station_type", cascade="all, delete-orphan")


class Station(Base):
    """
    The physical seat/room that can be booked.
    Examples: Hair Chair #1, Hair Chair #2, Spa Room A, Spa Room B
    """
    __tablename__ = "stations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    type_id = Column(UUID(as_uuid=True), ForeignKey("station_types.id"), nullable=False)
    label = Column(String(100), nullable=False)  # 'Hair Chair #2'
    is_active = Column(Boolean, nullable=False, default=True)  # allow soft-hide

    # Relationships
    station_type = relationship("StationType", back_populates="stations")


class ServiceStationRequirement(Base):
    """
    Defines which station types are required for a service and in what quantity.
    """
    __tablename__ = "service_station_requirements"

    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"), primary_key=True)
    station_type_id = Column(UUID(as_uuid=True), ForeignKey("station_types.id"), primary_key=True)
    qty = Column(Integer, nullable=False, default=1)

    # Relationships
    service = relationship("Service", back_populates="station_requirements")
    station_type = relationship("StationType", back_populates="service_requirements")