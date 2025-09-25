# SrBuj 3D – Personalización Avanzada

Este repo contiene el frontend (React) y backend (Django) para el ecommerce de impresiones 3D de SrBuj. Ahora suma dos experiencias modernas para clientes:

- **Configurador 3D en vivo** (`/personalizador/3d`): el usuario modifica color, material y grabado sobre un mate 3D renderizado con Three.js y puede agregar su configuración directamente al carrito.
- **Cotizador de archivos STL** (`/personalizador/subir-stl`): permite subir modelos propios, estimar peso/tiempo/costo a partir del volumen del STL y agregar la impresión personalizada al carrito.

## Requisitos

### Frontend
- Node.js 18+
- Ejecutar `npm install` dentro de `home/` para instalar la nueva dependencia `three`.

### Backend
- Python 3.12+
- Instalar las nuevas dependencias de análisis STL: `pip install -r requirements.txt` (agrega `numpy` y `numpy-stl`).
- Aplicar migraciones en `srbuj3d/` (se generó `0004_product_mostrar_inicio` previamente):
  ```bash
  cd srbuj3d
  source venv/bin/activate  # o entorno equivalente
  python manage.py migrate ventas
  ```

## Scripts útiles

```bash
# Frontend
cd home
npm start            # inicia CRA en http://localhost:3000

# Backend
cd ../srbuj3d
python manage.py runserver 3001
```

## Funcionalidades Clave

- Carrito persistente con productos estándar y personalizados (almacenados en localStorage).
- Panel admin con control para mostrar productos en la homepage y acceso directo al formulario de alta.
- Personalizador 3D con captura de snapshot para el carrito y registro de parámetros (color, material, grabado, notas).
- Cotizador STL que calcula volumen, peso, horas estimadas y precio basados en material/infill/calidad.
- API REST (`/api/personalizador/cotizar-stl`) abierta para recibir archivos `.stl` y devolver métricas.

## Próximos pasos sugeridos

- Agregar autenticación opcional al cotizador para guardar históricos por usuario.
- Adjuntar la captura del configurador en los mails de pedido o dashboard admin.
- Ajustar factores de precio/tiempo según experiencia real de impresión.
