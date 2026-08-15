# Sistema de pedidos y atención para restaurantes

> Documento de definición inicial del producto  
> Estado: **concepto / pre-MVP**

---

## 1. Visión del producto

La aplicación será una plataforma web que conecta al **cliente, la cocina, el bar y los mozos** a través de un sistema de pedidos iniciado mediante un código QR ubicado en cada mesa.

El cliente no necesita instalar una aplicación ni crear una cuenta.

### Flujo principal

```text
QR en la mesa
      ↓
Carta digital
      ↓
Cliente realiza pedido
      ↓
┌───────────────┬───────────────┐
│    COCINA     │      BAR      │
└───────┬───────┴───────┬───────┘
        │               │
        └───────┬───────┘
                ↓
             MOZO
                ↓
             MESA
                ↓
          Cuenta / POS
```

El objetivo no es reemplazar inicialmente el POS del restaurante, sino convertirse en la **capa de pedidos y operación del salón**.

---

# 2. Problema que queremos resolver

En un restaurante tradicional existen varios puntos donde se pierde tiempo o información:

- El cliente tiene que esperar al mozo para pedir.
- El mozo tiene que memorizar o registrar el pedido.
- El pedido debe llegar a cocina.
- Las bebidas pueden depender de otro circuito.
- El mozo necesita saber cuándo la comida está lista.
- Los clientes necesitan llamar al mozo para cosas simples.
- Cuando cambia el turno de un mozo hay que mantener la continuidad de las mesas.
- El pedido puede involucrar diferentes personas de una misma mesa.

La aplicación busca centralizar ese flujo.

---

# 3. Actores del sistema

## Cliente

Puede:

- Escanear el QR.
- Ver la carta.
- Buscar productos.
- Ver ingredientes y fotografías.
- Seleccionar variantes y extras.
- Agregar observaciones.
- Identificarse como integrante de la mesa.
- Realizar pedidos.
- Consultar el estado de sus pedidos.
- Realizar nuevos pedidos.
- Solicitar atención.
- Solicitar la cuenta.

No necesita crear una cuenta permanente.

## Mozo

Puede:

- Ver sus sectores.
- Ver las mesas asignadas.
- Recibir nuevos pedidos.
- Saber qué productos están listos.
- Recibir solicitudes de las mesas.
- Ver el estado de cada mesa.
- Marcar productos o pedidos como entregados.
- Gestionar la atención de sus mesas.

## Cocina

Tiene una interfaz específica para preparación.

Puede:

- Ver nuevos pedidos.
- Ver únicamente los productos correspondientes a cocina.
- Comenzar preparación.
- Marcar productos/pedidos como listos.

La interfaz debe ser muy sencilla y optimizada para operación rápida.

## Bar

Funciona como una estación independiente de cocina.

Puede:

- Recibir los productos correspondientes al bar.
- Comenzar preparación.
- Marcar bebidas como listas.

Esto permite que una parte del pedido esté lista antes que otra.

## Administrador

Gestiona:

- Restaurante.
- Mesas.
- Sectores.
- Mozos.
- Estaciones.
- Categorías.
- Productos.
- Precios.
- Opciones y extras.
- Usuarios.
- Códigos QR.
- Configuración general.

---

# 4. El QR

Cada mesa tendrá un QR físico.

El QR identifica:

```text
Restaurante
+
Mesa
```

No identifica al cliente.

El cliente escanea el QR y accede a la carta correspondiente a esa mesa.

### Decisión

**El QR no autentica al cliente.**

Si varias personas escanean el mismo QR, todas acceden a la misma sesión de mesa.

---

# 5. Sesión de mesa

Este es uno de los conceptos centrales del sistema.

No queremos pensar:

```text
QR → Pedido
```

Sino:

```text
QR
 ↓
Mesa
 ↓
Sesión de mesa
 ↓
Clientes
 ↓
Pedidos
```

Una mesa puede tener una sesión activa durante toda su permanencia.

### Ejemplo

```text
Mesa 14
Sesión #9281

Clientes
├── Persona A
├── Persona B
└── Persona C

Pedidos
├── #184
├── #185
└── #186
```

Una misma mesa puede realizar múltiples pedidos durante la sesión.

---

# 6. Varias personas en una mesa

Un pedido puede dividirse entre diferentes personas.

No será necesario crear cuentas de usuario.

La sesión puede tener participantes temporales:

```text
Mesa 14

👤 Persona A
👤 Persona B
👤 Persona C
```

Los productos pueden asociarse a una persona o marcarse como compartidos.

Esto permitirá posteriormente implementar **cuentas separadas**, aunque el pago dividido no forme parte del MVP.

---

# 7. Pedidos

Un pedido pertenece a una sesión de mesa.

```text
Sesión #9281
    │
    ├── Pedido #184
    ├── Pedido #185
    └── Pedido #186
```

Cada pedido puede contener múltiples productos.

Pero los productos no necesariamente se preparan en el mismo lugar.

---

# 8. Estaciones: cocina y bar

Cada producto tendrá asociada una estación.

Ejemplo:

```text
COCINA
├── Hamburguesas
├── Pizzas
├── Entradas
└── Postres

BAR
├── Bebidas
├── Cócteles
├── Cafés
└── Jugos
```

Si un cliente realiza:

```text
1 Hamburguesa
1 Porción de papas
2 Cervezas
1 Agua
```

el sistema separa automáticamente el trabajo entre las estaciones.

### Cocina

```text
Pedido #184
Mesa 14

1 Hamburguesa
1 Papas
```

### Bar

```text
Pedido #184
Mesa 14

2 Cervezas
1 Agua
```

Cada estación puede trabajar independientemente.

---

# 9. Estados de los productos

No conviene que todo el pedido tenga un único estado.

Los productos pueden evolucionar independientemente.

Ejemplo:

```text
Pedido #184

Hamburguesa
→ Preparando
→ Lista

Papas
→ Preparando
→ Lista

Cerveza
→ Lista

Agua
→ Lista
```

Esto permite que el mozo sepa exactamente qué está disponible para entregar.

---

# 10. El mozo recibe eventos accionables

El sistema no debería limitarse a mostrar:

> "Pedido #184 recibido."

Debe indicar qué necesita hacer el mozo.

Ejemplo:

```text
🔔 Mesa 14

Pedido #184

2 Hamburguesas
2 Cervezas
1 Agua
```

Posteriormente:

```text
🟢 Mesa 14

Bebidas listas

2 Cervezas
1 Agua
```

Y finalmente:

```text
🟢 Mesa 14

Pedido #184 completo
```

El objetivo es reducir la necesidad de que el mozo interprete información.

---

# 11. Sectores de mesas

Las mesas se organizan mediante sectores.

Ejemplo:

```text
Sector A
├── Mesa 1
├── Mesa 2
├── Mesa 3
└── Mesa 4

Sector B
├── Mesa 5
├── Mesa 6
└── Mesa 7
```

Los mozos se asignan a sectores.

### Decisión

**No se asigna permanentemente una mesa a un mozo.**

La relación será:

```text
Mesa
 ↓
Sector
 ↓
Mozo activo
```

Esto facilita los cambios de turno.

---

# 12. Cambios de turno

Las mesas permanecen activas aunque cambie el mozo.

Ejemplo:

```text
20:00

Sector A
└── Juan
```

Juan termina su turno:

```text
Juan
↓
Sesión finalizada
```

Nuevo turno:

```text
Pedro
↓
Sesión activa
```

Las mesas continúan exactamente como estaban.

```text
Mesa 14
├── Misma sesión
├── Mismos clientes
├── Mismos pedidos
└── Nuevo mozo responsable
```

---

# 13. Historial de atención

El sistema conservará el historial de qué mozo estuvo responsable de cada sector durante cada período.

Ejemplo:

```text
Mesa 14

20:00 – 21:00
Mozo: Juan

21:00 – 23:00
Mozo: Pedro
```

Esto permite mantener trazabilidad sin modificar la sesión de la mesa.

---

# 14. Estado de una mesa

Una mesa puede tener diferentes estados.

Ejemplo:

```text
Mesa 14

Estado: OCUPADA
Sector: A
Mozo: Pedro
Sesión: #9281
```

Mientras otra puede estar:

```text
Mesa 15

Estado: LIBRE
Sector: A
Mozo: Pedro
```

La asignación al sector y el estado de ocupación son conceptos diferentes.

---

# 15. Solicitudes de mesa

La aplicación no debería limitarse a recibir pedidos.

El cliente también podrá realizar solicitudes rápidas:

```text
Necesito...

[ Llamar al mozo ]

[ Cubiertos ]

[ Servilletas ]

[ Agua ]

[ Pedir la cuenta ]

[ Otra solicitud ]
```

Estas solicitudes aparecerán directamente al mozo responsable.

Ejemplo:

```text
🔔 Mesa 14

Solicita:
"Necesita cubiertos"

Mozo responsable:
Pedro
```

Esto convierte el producto en algo más que una carta QR.

---

# 16. Cierre de la mesa

La mesa no se cerrará automáticamente.

El cierre será una acción explícita.

Flujo:

```text
Cliente
 ↓
Solicita cuenta
 ↓
Mozo entrega/procesa cuenta
 ↓
Pago mediante el sistema existente
 ↓
Mesa cerrada
 ↓
Sesión finalizada
 ↓
Mesa libre
```

### Decisión

El POS existente continúa siendo responsable inicialmente de:

- Caja.
- Facturación.
- Pago.
- Gestión fiscal.

La aplicación se concentra en la operación previa.

---

# 17. Relación con el POS

El restaurante ya dispone de un POS.

Por lo tanto, el producto **no pretende reemplazarlo inicialmente**.

### Nuestra aplicación

```text
Carta
Pedidos
Cocina
Bar
Mozos
Mesas
Solicitudes
Sesiones
```

### POS

```text
Venta
Facturación
Caja
Pago
```

El principal punto pendiente será definir cómo transferir los pedidos de nuestra plataforma al POS.

Opciones futuras:

1. Integración directa mediante API.
2. Integración con determinados POS.
3. Exportación de pedidos.
4. Registro manual en el POS como solución temporal.

---

# 18. Flujo completo de una mesa

```text
┌──────────────────────┐
│ Cliente llega        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Escanea QR           │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Se abre sesión mesa  │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Consulta carta       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Realiza pedido       │
└──────────┬───────────┘
           ↓
       ┌───┴────┐
       ↓        ↓
   COCINA      BAR
       │        │
       └───┬────┘
           ↓
┌──────────────────────┐
│ Productos disponibles│
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Mozo recibe aviso    │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Entrega al cliente   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Cliente puede pedir  │
│ nuevamente            │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Solicita cuenta      │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ POS / pago           │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Sesión cerrada       │
│ Mesa → LIBRE         │
└──────────────────────┘
```

---

# 19. MVP

El MVP debería concentrarse en cuatro interfaces.

## Cliente

- QR.
- Carta digital.
- Categorías.
- Productos.
- Extras.
- Carrito.
- Participante de mesa.
- Pedido.
- Estado del pedido.
- Solicitudes.
- Solicitar cuenta.

## Cocina

- Pedidos nuevos.
- Preparación.
- Pedidos listos.

## Bar

- Pedidos nuevos.
- Preparación.
- Pedidos listos.

## Mozo

- Sectores.
- Mesas.
- Pedidos.
- Productos listos.
- Solicitudes.
- Entregas.
- Estado de las mesas.

## Administración

- Restaurante.
- Sectores.
- Mesas.
- Mozos.
- Estaciones.
- Categorías.
- Productos.
- Extras.
- QR.

---

# 20. Fuera del MVP

Por ahora no se incluirán:

- Inventario.
- Contabilidad.
- Facturación.
- Delivery.
- Reservas.
- CRM.
- Programa de fidelización.
- Cupones.
- IA.
- Gestión de proveedores.
- Múltiples sucursales.
- Integraciones con múltiples POS.
- Pago online complejo.
- Estadísticas avanzadas.

Estas funcionalidades podrán evaluarse después de validar el flujo principal.

---

# 21. Modelo de dominio inicial

La estructura conceptual queda aproximadamente así:

```text
Restaurant
│
├── Sectors
│   │
│   └── Tables
│
├── Staff
│   │
│   └── Staff Sessions
│
├── Stations
│
├── Categories
│   │
│   └── Products
│
└── Table Sessions
    │
    ├── Members
    │
    ├── Orders
    │   │
    │   └── Order Items
    │       │
    │       └── Station
    │
    └── Table Requests
```

---

# 22. Modelo de datos inicial

Las entidades principales serían:

```text
restaurants
users
restaurant_users

sectors
tables

staff_sessions

stations

categories
products
product_options

qr_codes

table_sessions
table_session_members

orders
order_items
order_item_options

table_requests
```

Posteriormente podrían aparecer:

```text
payments
customers
discounts
coupons
inventory
printers
pos_integrations
analytics
```

---

# 23. Modelo comercial

Todavía no se toma una decisión.

Las alternativas principales son:

### Suscripción fija

```text
R$ X / mes
```

Simple y predecible.

### Según cantidad de mesas

```text
Hasta 10 mesas
Hasta 30 mesas
Hasta 60 mesas
```

Más relacionado con el tamaño del restaurante.

### Por volumen de pedidos

```text
Suscripción
+
coste por pedido
```

Alinea ingresos con utilización, pero puede generar mayor resistencia comercial.

### Decisión actual

**No definir todavía el modelo comercial.**

Primero se debería validar qué funcionalidades generan valor real para el restaurante.

---

# 24. Posicionamiento inicial

Evitar posicionarlo simplemente como:

> **"Carta digital con QR."**

Ese mercado es relativamente fácil de copiar y existen muchas soluciones similares.

El concepto más interesante es:

> **Sistema de pedidos y atención en mesa.**

El QR es solamente la puerta de entrada.

El verdadero producto es la conexión:

```text
CLIENTE
   ↓
PEDIDO
   ↓
COCINA / BAR
   ↓
MOZO
   ↓
MESA
   ↓
POS
```

---

# 25. Evolución prevista

## V1 — Pedidos

```text
QR
 ↓
Carta
 ↓
Pedido
 ↓
Cocina + Bar
 ↓
Mozo
```

## V2 — Atención

```text
Pedidos
+
Solicitudes
+
Estado de mesas
+
Turnos de mozos
+
Cuenta
```

## V3 — Operación

```text
POS
+
Pagos PIX
+
Inventario
+
Impresoras
+
Estadísticas
```

## V4 — Inteligencia

Con suficientes datos históricos:

```text
Ventas
   ↓
Análisis
   ↓
Predicciones
   ↓
Recomendaciones operativas
```

La IA no debería ser un elemento central del MVP. Primero necesitamos generar datos operativos reales.

---

# 26. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Acceso del cliente | QR desde la mesa |
| Aplicación del cliente | Web, sin instalación |
| Cuenta del cliente | No obligatoria |
| POS | El restaurante ya tiene uno |
| Rol de nuestra aplicación | Pedidos + operación de salón |
| Entrada del pedido | Directamente a cocina/bar |
| Notificación | Cocina/bar + mozo |
| Cocina | Estación independiente |
| Bar | Estación independiente |
| División de pedidos | Sí |
| Personas por mesa | Sí, mediante participantes temporales |
| Organización de mesas | Sectores |
| Asignación de mozos | Por sector |
| Cambio de turno | Sí, sin cerrar mesas |
| Mesa | Permanece activa durante el cambio de mozo |
| Historial de mozos | Sí |
| Sesión de mesa | Sí |
| Nuevos pedidos durante la sesión | Sí |
| Solicitudes al mozo | Sí |
| Cierre de mesa | Manual |
| Pago | Inicialmente mediante POS existente |
| Inventario | Fuera del MVP |
| Facturación | Fuera del MVP |
| Delivery | Fuera del MVP |
| IA | Fuera del MVP |
| Modelo comercial | Pendiente |

---

# 27. Próximo paso

Antes de empezar a programar, conviene definir **tres cosas en este orden**:

### 1. Máquina de estados

Definir exactamente qué estados puede tener:

- Mesa.
- Sesión.
- Pedido.
- Item del pedido.
- Solicitud.
- Turno del mozo.

### 2. Flujos de usuario

Diseñar los recorridos concretos de:

- Cliente.
- Mozo.
- Cocina.
- Bar.
- Administrador.

### 3. Modelo de datos

Convertir el modelo conceptual en tablas, relaciones y reglas de negocio.

Una vez cerrados esos tres puntos, ya se puede pasar a **arquitectura técnica + estructura del proyecto + diseño de las interfaces del MVP** sin tener que rehacer la base del sistema posteriormente.
