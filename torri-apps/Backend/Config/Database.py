from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .Settings import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos de tenant-specific schemas
Base = declarative_base()

# Base para modelos do schema público
# Adicionar metadados para o schema publico, se necessário para Alembic
# metadata_public = MetaData(schema=settings.default_schema_name)
# BasePublic = declarative_base(metadata=metadata_public)
# Simplesmente criar outra base pode ser suficiente e o schema é definido no modelo.
BasePublic = declarative_base()

