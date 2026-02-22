import pandas as pd
import matplotlib.pyplot as plt
import glob
import os
import sys

# 1. Encontrar el archivo CSV más reciente
# Ajusta la ruta si tus CSVs están en otro lado
search_path = os.path.join(os.path.dirname(__file__), 'metrics-*.csv')
list_of_files = glob.glob(search_path)

if not list_of_files:
    print(f"❌ No se encontraron archivos CSV en: {search_path}")
    print("Asegúrate de haber ejecutado 'node scripts/record-stats.js' primero.")
    sys.exit(1)

latest_file = max(list_of_files, key=os.path.getctime)
print(f"📊 Procesando archivo más reciente: {latest_file}")

# 2. Cargar datos
try:
    df = pd.read_csv(latest_file, on_bad_lines='skip', names=['Timestamp', 'Container', 'CPU', 'MemUsage', 'MemLimit', 'MemPerc'], header=0)
except Exception as e:
    print(f"Error leyendo CSV: {e}")
    sys.exit(1)

# Limpiar timestamp
df['Timestamp'] = pd.to_datetime(df['Timestamp'])
df['CPU'] = pd.to_numeric(df['CPU'], errors='coerce')
df['MemUsage'] = pd.to_numeric(df['MemUsage'], errors='coerce')

# AGRUPAR REPLICAS:
# Si hay api-bank-app-1, api-bank-app-2, etc. vamos a agruparlas
df['Service'] = df['Container'].apply(lambda x: x.split('-')[0] if '-' in x else x) 
# O mejor, agrupar por coincidencia
def map_service(name):
    if 'api-bank-app' in name: return 'bank-api-app (Total)'
    if 'db' in name: return 'bank-api-db'
    if 'pgbouncer' in name: return 'bank-api-pgbouncer'
    return name

df['Category'] = df['Container'].apply(map_service)

# Sumar CPU y Memoria por Categoría
df_grouped = df.groupby(['Timestamp', 'Category']).sum(numeric_only=True).reset_index()

# 3. Configurar Gráficos
plt.style.use('bmh') 
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10), sharex=True)

# Lista de servicios agrupados
services = df_grouped['Category'].unique()

# 4. Graficar CPU
for service in services:
    subset = df_grouped[df_grouped['Category'] == service]
    ax1.plot(subset['Timestamp'], subset['CPU'], label=service)

ax1.set_title('Uso de CPU por Servicio (Suma Total Replicas) (%)')
ax1.set_ylabel('CPU %')
ax1.legend(loc='upper left')
ax1.grid(True)

# 5. Graficar Memoria
for service in services:
    subset = df_grouped[df_grouped['Category'] == service]
    ax2.plot(subset['Timestamp'], subset['MemUsage'], label=service)

ax2.set_title('Uso de Memoria por Contenedor (MB)')
ax2.set_ylabel('Memoria (MB)')
ax2.set_xlabel('Tiempo')
ax2.legend(loc='upper left')
ax2.grid(True)

# Formatear eje X
plt.gcf().autofmt_xdate()

# 6. Guardar imagen
output_img = latest_file.replace('.csv', '.png')
plt.savefig(output_img)
print(f"✅ Gráfico guardado exitosamente en: {output_img}")
# plt.show() # Descomentar si quieres verla ventana interactiva (requiere entorno gráfico)
