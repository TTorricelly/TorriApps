import re
from datetime import datetime

def parse_client_data(file_path):
    try:
        with open(file_path, 'r', encoding='cp1252') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(file_path, 'r', encoding='latin-1') as f:
            content = f.read()

    client_blocks = re.split(r'\s*-{70,}\s*', content)

    clients = []
    for block in client_blocks:
        block = block.strip()
        if not block or "Listagem de Clientes" in block:
            continue

        data = {}

        # Extract data using regex on the whole block for flexibility
        codigo_match = re.search(r'C.digo:\s*(\d+)', block, re.IGNORECASE)
        if codigo_match: data['codigo'] = int(codigo_match.group(1).strip())

        cliente_match = re.search(r'Cliente:\s*(.*?)(?:\s*Apelido:|$)', block, re.IGNORECASE | re.DOTALL)
        if cliente_match: data['cliente'] = re.sub(r'\s{2,}', ' ', cliente_match.group(1).replace('\n', ' ')).strip()

        apelido_match = re.search(r'Apelido:\s*(.*)', block, re.IGNORECASE | re.DOTALL)
        if apelido_match: data['apelido'] = apelido_match.group(1).strip().split('\n')[0].strip()

        nasc_match = re.search(r'Data de Nasc\.:\s*(\d{2}/\d{2}/\d{4})', block, re.IGNORECASE)
        if nasc_match: data['data_nasc'] = nasc_match.group(1).strip()

        # Isolate and parse the address line
        address_full_line_match = re.search(r'Endere.o:.*(?=CEP:)', block, re.IGNORECASE | re.DOTALL)
        if address_full_line_match:
            address_full_line = address_full_line_match.group(0)
            
            endereco_match = re.search(r'Endere.o:\s*(.*?)\s*Cidade:', address_full_line, re.IGNORECASE | re.DOTALL)
            if endereco_match: data['endereco'] = re.sub(r'\s{2,}', ' ', endereco_match.group(1).replace('\n', ' ')).strip()

            cidade_match = re.search(r'Cidade:\s*(.*?)\s*Estado:', address_full_line, re.IGNORECASE | re.DOTALL)
            if cidade_match: data['cidade'] = re.sub(r'\s{2,}', ' ', cidade_match.group(1).replace('\n', ' ')).strip()

            estado_match = re.search(r'Estado:\s*(.*)', address_full_line, re.IGNORECASE | re.DOTALL)
            if estado_match: data['estado'] = re.sub(r'\s{2,}', ' ', estado_match.group(1).replace('\n', ' ')).strip()

        # Isolate and parse the CEP/Phone line
        cep_full_line_match = re.search(r'CEP:.*(?=Pref.:|$)', block, re.IGNORECASE | re.DOTALL)
        if cep_full_line_match:
            cep_full_line = cep_full_line_match.group(0)
            
            cep_match = re.search(r'CEP:\s*(.*?)\s*Telefone:', cep_full_line, re.IGNORECASE)
            if cep_match:
                cep_val = cep_match.group(1).strip()
                if "_____-___" not in cep_val:
                    data['cep'] = cep_val.strip()

            phones = re.findall(r'Telefone\s*:?\s*([\d\s]+)', cep_full_line, re.IGNORECASE)
            cleaned_phones = [p.strip() for p in phones if p.strip() and p.strip() != '000000000']
            data['phone_numbers'] = cleaned_phones

        if data.get('cliente') and data['cliente'].lower() != 'atualizar cadastro':
            clients.append(data)
            
    return clients

def generate_insert_statements(clients):
    inserts = []
    for client in clients:
        codigo = client.get('codigo', 'NULL')
        cliente = client.get('cliente', '').replace("'", "''")
        apelido = client.get('apelido', '').replace("'", "''")
        data_nasc_str = client.get('data_nasc')

        if data_nasc_str:
            try:
                dt_obj = datetime.strptime(data_nasc_str, '%d/%m/%Y')
                if 1900 < dt_obj.year < datetime.now().year + 5:
                     data_nasc = f"'{dt_obj.strftime('%Y-%m-%d')}'"
                else:
                     data_nasc = 'NULL'
            except (ValueError, TypeError):
                data_nasc = 'NULL'
        else:
            data_nasc = 'NULL'

        endereco = client.get('endereco', '').replace("'", "''")
        cidade = client.get('cidade', '').replace("'", "''")
        estado = client.get('estado', '').replace("'", "''")
        cep = client.get('cep', '').replace("'", "''")
        
        phone_numbers = ", ".join(client.get('phone_numbers', []))
        phone_numbers = phone_numbers.replace("'", "''")

        insert_statement = (
            f"INSERT INTO users (full_name, nickname, date_of_birth, address_street, address_city, address_state, address_cep, phone_number, role) VALUES "
            f"('{cliente}', '{apelido}', {data_nasc}, '{endereco}', '{cidade}', '{estado}', '{cep}', '{phone_numbers}', 'CLIENTE');"
        )
        inserts.append(insert_statement)
    return inserts

def main():
    file_path = '/Users/thiagotorricelly/Projects/TorriApps/migration_clients/CLIENTES.txt'
    output_path = '/Users/thiagotorricelly/Projects/TorriApps/migration_clients/inserts.sql'
    
    clients = parse_client_data(file_path)
    
    inserts = generate_insert_statements(clients)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for insert in inserts:
            f.write(insert + '\n')
            
    print(f"Successfully generated {len(inserts)} insert statements in {output_path}")

if __name__ == "__main__":
    main()