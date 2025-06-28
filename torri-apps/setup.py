#!/usr/bin/env python3
"""
Setup configuration for TorriApps Backend.
This enables proper package imports for testing and development.
"""

from setuptools import setup, find_packages

setup(
    name="torriapps-backend",
    version="1.0.0",
    description="TorriApps Backend - Salon Management System",
    author="TorriApps Team",
    author_email="support@torriapps.com",
    packages=find_packages(where="Backend"),
    package_dir={"": "Backend"},
    python_requires=">=3.11",
    install_requires=[
        # Core dependencies (these should match Requirements.txt)
        "fastapi",
        "sqlalchemy",
        "pydantic",
        "psycopg2-binary",
        "alembic",
        "python-jose[cryptography]",
        "passlib[bcrypt]",
        "python-multipart",
        "uvicorn[standard]",
    ],
    extras_require={
        "dev": [
            "pytest",
            "pytest-asyncio",
            "pytest-cov",
            "pytest-mock",
            "httpx",  # For FastAPI testing
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.11",
        "Framework :: FastAPI",
    ],
    include_package_data=True,
    zip_safe=False,
)