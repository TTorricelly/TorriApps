"""
ViaCEP integration service for Brazilian address lookup.
Provides CEP (postal code) lookup functionality using the ViaCEP API.
"""

import httpx
from typing import Optional, Dict, Any
import asyncio
from Core.Utils.brazilian_validators import clean_cep, validate_cep_format


class ViaCEPService:
    """Service for integrating with ViaCEP API for address lookup."""
    
    BASE_URL = "https://viacep.com.br/ws"
    TIMEOUT = 10.0  # seconds
    
    @classmethod
    async def lookup_cep(cls, cep: str) -> Optional[Dict[str, Any]]:
        """
        Look up address information by CEP using ViaCEP API.
        
        Args:
            cep: Brazilian postal code (with or without formatting)
            
        Returns:
            Dictionary with address information or None if not found
            
        Example return:
        {
            "cep": "01310-100",
            "logradouro": "Avenida Paulista",
            "complemento": "",
            "bairro": "Bela Vista",
            "localidade": "São Paulo",
            "uf": "SP",
            "ibge": "3550308",
            "gia": "1004",
            "ddd": "11",
            "siafi": "7107"
        }
        """
        if not cep:
            return None
        
        # Clean and validate CEP
        clean = clean_cep(cep)
        if not validate_cep_format(clean):
            return None
        
        try:
            async with httpx.AsyncClient(timeout=cls.TIMEOUT) as client:
                url = f"{cls.BASE_URL}/{clean}/json/"
                response = await client.get(url)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if CEP was found (ViaCEP returns {"erro": True} for invalid CEPs)
                    if not data.get("erro"):
                        return cls._normalize_address_data(data)
                
                return None
                
        except Exception as e:
            print(f"Error looking up CEP {cep}: {e}")
            return None
    
    @classmethod
    def _normalize_address_data(cls, viacep_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Normalize ViaCEP response to match our database fields.
        
        Args:
            viacep_data: Raw response from ViaCEP API
            
        Returns:
            Normalized dictionary with our field names
        """
        return {
            "address_cep": viacep_data.get("cep", ""),
            "address_street": viacep_data.get("logradouro", ""),
            "address_complement": viacep_data.get("complemento", ""),
            "address_neighborhood": viacep_data.get("bairro", ""),
            "address_city": viacep_data.get("localidade", ""),
            "address_state": viacep_data.get("uf", ""),
            # Additional fields that might be useful
            "ibge_code": viacep_data.get("ibge", ""),
            "area_code": viacep_data.get("ddd", ""),
        }
    
    @classmethod
    def lookup_cep_sync(cls, cep: str) -> Optional[Dict[str, Any]]:
        """
        Synchronous version of CEP lookup for use in non-async contexts.
        
        Args:
            cep: Brazilian postal code
            
        Returns:
            Dictionary with address information or None if not found
        """
        try:
            return asyncio.run(cls.lookup_cep(cep))
        except Exception as e:
            print(f"Error in sync CEP lookup for {cep}: {e}")
            return None


# Convenience functions for direct usage
async def lookup_address_by_cep(cep: str) -> Optional[Dict[str, str]]:
    """
    Async convenience function to lookup address by CEP.
    
    Args:
        cep: Brazilian postal code
        
    Returns:
        Dictionary with normalized address fields or None
    """
    return await ViaCEPService.lookup_cep(cep)


def lookup_address_by_cep_sync(cep: str) -> Optional[Dict[str, str]]:
    """
    Sync convenience function to lookup address by CEP.
    
    Args:
        cep: Brazilian postal code
        
    Returns:
        Dictionary with normalized address fields or None
    """
    return ViaCEPService.lookup_cep_sync(cep)


# Example usage for testing
if __name__ == "__main__":
    # Test the service
    test_cep = "01310-100"  # Avenida Paulista, São Paulo
    
    async def test_lookup():
        result = await lookup_address_by_cep(test_cep)
        print(f"Lookup result for {test_cep}:")
        print(result)
    
    # Run test
    asyncio.run(test_lookup())