# Product Requirements Document (PRD) v1.0

## Closet AI — Personal Wardrobe Intelligence Platform

**Versión:** 1.0  
**Fecha:** 23 de agosto de 2026  
**Estado:** Base para definición tecnológica  
**Tipo de producto:** Aplicación personal con IA, gestión de guardarropa, automatización doméstica e interfaces multimodales  
**Usuarios iniciales:** 2 personas  
**Mercado inicial:** Uso privado  
**Plataformas previstas:** Web/PWA, tablet, Telegram, Alexa/Echo y Echo Show

---

# 1. Propósito del documento

Este PRD define los requisitos funcionales, de producto y no funcionales de **Closet AI** con suficiente detalle para permitir posteriormente:

- seleccionar tecnologías;
- diseñar arquitectura;
- definir modelo de datos;
- seleccionar proveedores de inteligencia artificial;
- estimar complejidad;
- crear backlog;
- definir un MVP;
- iniciar implementación incremental.

Este documento **no selecciona todavía una tecnología concreta**.

Su objetivo es establecer primero qué necesita resolver el producto para que las decisiones tecnológicas posteriores se realicen con base en requisitos reales y no por preferencia de herramientas.

---

# 2. Resumen del producto

Closet AI será una plataforma personal capaz de administrar de manera inteligente el guardarropa de dos usuarios.

La plataforma mantendrá información estructurada sobre:

- usuarios;
- estilos;
- preferencias;
- características corporales relevantes;
- prendas;
- disponibilidad;
- historial de uso;
- lavado;
- desgaste;
- outfits;
- feedback;
- compras futuras.

A partir de esta información, Closet AI podrá generar recomendaciones personalizadas considerando además:

- actividad;
- destino;
- horario;
- temperatura;
- lluvia;
- formalidad;
- comodidad;
- frecuencia reciente de uso.

El sistema deberá aprender progresivamente de las decisiones reales del usuario.

---

# 3. Problema

Actualmente, una persona puede conocer aproximadamente qué ropa tiene, pero generalmente no dispone de información estructurada que permita responder con precisión:

- qué prendas están realmente disponibles;
- qué prendas combinan mejor;
- cuáles fueron utilizadas recientemente;
- qué debería lavarse;
- qué no necesita comprarse;
- qué prendas faltan;
- qué estilo utiliza realmente;
- qué prendas ofrecen mayor valor.

La toma de decisión diaria requiere recordar manualmente toda esta información.

Closet AI pretende transformar el guardarropa en un sistema gestionado mediante datos y asistencia inteligente.

---

# 4. Objetivo principal

Permitir que una persona pueda expresar una necesidad de vestimenta en lenguaje natural y obtener automáticamente una recomendación válida utilizando exclusivamente prendas existentes y disponibles de su guardarropa.

Ejemplo:

> Hoy voy a trabajar desde casa, por la tarde iré al gimnasio y por la noche tengo una cena informal.

El sistema deberá interpretar la solicitud y producir recomendaciones de vestimenta adecuadas para cada actividad.

---

# 5. Objetivos secundarios

El producto deberá progresivamente:

1. ayudar a construir un guardarropa inicial;
2. registrar todas las prendas;
3. entender preferencias personales;
4. aprender del comportamiento;
5. administrar disponibilidad;
6. reducir compras redundantes;
7. optimizar reutilización;
8. administrar lavado;
9. controlar desgaste;
10. mejorar la utilización global del guardarropa.

---

# 6. Hipótesis de producto

Closet AI parte de las siguientes hipótesis:

### H1

Las recomendaciones serán significativamente mejores si la IA solamente trabaja con prendas verificadas por el sistema.

### H2

Una combinación de reglas determinísticas + IA será más confiable que utilizar únicamente un modelo generativo.

### H3

Mientras menor sea la fricción para actualizar una prenda, mayor será la precisión del guardarropa.

### H4

Las decisiones reales del usuario serán más útiles para aprender su estilo que el cuestionario inicial.

### H5

Las recomendaciones deben poder consumirse por diferentes interfaces sin duplicar lógica de negocio.

---

# 7. Principios de producto

## 7.1 Data First

La base de datos representa la realidad.

La IA interpreta la realidad.

La IA nunca sustituye la fuente de verdad.

---

## 7.2 AI Assisted, not AI Controlled

La inteligencia artificial podrá sugerir acciones, pero las operaciones críticas deberán permanecer controladas por reglas o confirmación del usuario.

---

## 7.3 Multichannel

Closet AI deberá permitir que el mismo núcleo pueda utilizarse desde:

- web;
- tablet;
- Telegram;
- Alexa;
- Echo Show;
- futuros clientes.

---

## 7.4 Personalización progresiva

El sistema debe funcionar desde el primer día pero mejorar conforme acumula datos.

---

## 7.5 Minimal friction

Registrar:

- uso;
- lavado;
- feedback;
- estado;

deberá requerir la menor interacción posible.

---

# 8. Alcance de usuarios

## Primera versión

El sistema deberá soportar:

```text
1 Household
2 usuarios
```

Aunque inicialmente sean únicamente dos personas, el modelo no deberá codificarse exclusivamente para dos usuarios.

Debe soportar potencialmente:

```text
Household
↓
N users
```

---

# 9. Personas del producto

## Persona A — Usuario principal

Necesita:

- recomendaciones;
- administración del guardarropa;
- registro de prendas;
- ayuda para comprar;
- interacción por voz;
- automatización.

## Persona B — Segundo usuario del hogar

Necesita las mismas funcionalidades pero con:

- perfil independiente;
- preferencias independientes;
- prendas independientes;
- recomendaciones independientes.

---

# 10. Jobs to be Done

## JTBD-01

Cuando no sé qué ponerme, quiero indicar lo que voy a hacer para recibir un outfit adecuado sin revisar manualmente toda mi ropa.

## JTBD-02

Cuando compro ropa, quiero saber si realmente agrega valor a mi guardarropa.

## JTBD-03

Cuando utilizo ropa, quiero que el sistema recuerde automáticamente su historial.

## JTBD-04

Cuando voy a lavar, quiero saber qué conviene lavar.

## JTBD-05

Cuando viajo, quiero seleccionar el mínimo conjunto de ropa que cubra mis necesidades.

---

# 11. Experiencia objetivo

La experiencia principal debe ser conversacional.

Ejemplo:

> “¿Qué me pongo hoy?”

El sistema podrá solicitar contexto únicamente cuando falte información relevante.

Ejemplo:

> “¿Vas a salir o estarás en casa?”

Sin embargo, si el usuario proporciona suficiente información inicialmente, no deberá realizar preguntas innecesarias.

---

# 12. Flujo principal del producto

```text
Usuario
↓
Solicitud
↓
Identificación del usuario
↓
Interpretación del contexto
↓
Consulta del guardarropa
↓
Consulta del clima
↓
Reglas de disponibilidad
↓
Generación de opciones
↓
Ranking
↓
Presentación
↓
Selección
↓
Confirmación de uso
↓
Actualización del guardarropa
↓
Aprendizaje
```

---

# 13. Módulos funcionales

El producto deberá dividirse conceptualmente en:

1. Identity & Household
2. User Profile
3. Style Discovery
4. Wardrobe
5. Garment Lifecycle
6. Context
7. Outfit Recommendation
8. Artificial Intelligence
9. Visualization
10. Laundry
11. Shopping
12. Notifications
13. Integrations
14. Analytics

---

# 14. Identity & Household

## Requerimientos

El sistema deberá permitir:

- crear un hogar;
- crear usuarios;
- asignar usuarios al hogar;
- identificar al propietario de cada prenda;
- mantener preferencias separadas.

## Restricción crítica

Una prenda de un usuario nunca deberá aparecer en recomendaciones del otro usuario salvo que explícitamente exista una funcionalidad futura de prendas compartidas.

---

# 15. User Profile

Cada usuario podrá tener:

- nombre;
- alias;
- fecha de nacimiento o edad opcional;
- estatura;
- peso opcional;
- tallas;
- talla de calzado;
- fits preferidos;
- preferencias de comodidad.

---

# 16. Perfil corporal

El perfil corporal deberá permitir registrar únicamente información útil para recomendaciones de vestimenta.

Ejemplos:

- estatura;
- complexión;
- proporción torso/pierna;
- hombros;
- cintura;
- tipo de fit preferido.

El sistema no deberá exigir información que no sea necesaria para proporcionar valor.

---

# 17. Style Discovery

Closet AI deberá incluir un onboarding destinado a determinar las preferencias del usuario.

El onboarding no deberá depender únicamente de preguntas textuales.

Se favorecerán comparaciones visuales.

---

# 18. Salida del Style Discovery

El sistema deberá obtener un perfil como:

```text
Smart Casual    40%
Minimalist      30%
Streetwear      20%
Athleisure      10%
```

Además:

```text
Preferred colors
Preferred fits
Preferred footwear
Avoided garments
Formality tolerance
Experimentation level
```

---

# 19. Recalibración de estilo

El perfil inicial no será permanente.

Deberá poder actualizarse utilizando:

- selecciones reales;
- rechazos;
- feedback;
- prendas compradas;
- prendas usadas frecuentemente.

---

# 20. Wardrobe Builder

Después del onboarding, el sistema podrá proponer un guardarropa inicial.

Entradas:

- perfil;
- clima;
- actividades;
- frecuencia de lavado;
- presupuesto;
- estilo;
- necesidades.

Salida:

- categorías recomendadas;
- cantidades;
- colores;
- prioridades.

---

# 21. Priorización

Cada recomendación de compra deberá tener una prioridad:

```text
P0 — Required
P1 — High value
P2 — Complementary
P3 — Optional
```

---

# 22. Digital Closet

El guardarropa digital es uno de los componentes centrales del producto.

El usuario deberá poder:

- registrar;
- consultar;
- modificar;
- retirar;

prendas.

---

# 23. Alta manual de prenda

Debe poder registrarse sin IA.

Información mínima:

```text
owner
category
primary color
status
```

Todo lo demás podrá ser opcional.

---

# 24. Alta asistida por IA

El usuario podrá subir una fotografía.

El sistema intentará inferir:

- categoría;
- subcategoría;
- color;
- patrón;
- material probable;
- fit;
- formalidad.

El usuario deberá confirmar los datos.

---

# 25. Requerimiento de fotografías

La plataforma deberá soportar como mínimo:

- una fotografía principal;
- múltiples fotografías en el futuro.

Las fotografías deben poder visualizarse en web y tablet.

---

# 26. Garment Record

Un registro de prenda podrá contener:

```text
garment_id
user_id
category
subcategory
brand
model
primary_color
secondary_colors
pattern
fit
size
material
season
formality
purchase_price
purchase_date
store
status
condition
wear_count
wash_count
last_worn_at
last_washed_at
image
```

---

# 27. Garment State

El estado de una prenda deberá estar definido explícitamente.

Estados iniciales:

```text
CLEAN_AVAILABLE
WORN_REUSABLE
LAUNDRY_BIN
WASHING
DRYING
CLEAN_PENDING_STORAGE
UNAVAILABLE
REPAIR
RETIRED
DONATED
DISCARDED
```

---

# 28. Principio de disponibilidad

Para una recomendación únicamente serán candidatas aquellas prendas que las reglas de negocio consideren utilizables.

Por defecto:

```text
CLEAN_AVAILABLE
WORN_REUSABLE
```

---

# 29. Garment Usage

Cuando el usuario confirma que utilizó una prenda, se deberá registrar un evento de uso.

Debe contener como mínimo:

```text
user
garment
date/time
context
```

Opcionalmente:

```text
hours_used
activity
weather
```

---

# 30. Uso parcial de outfit

Debe contemplarse:

> “Usé el outfit, pero cambié los zapatos.”

El usuario deberá poder confirmar individualmente las prendas utilizadas.

---

# 31. Outfit Recommendation

El usuario podrá solicitar un outfit mediante:

- formulario;
- texto;
- voz.

---

# 32. Información opcional de solicitud

El usuario podrá proporcionar:

- actividad;
- destino;
- hora;
- formalidad;
- preferencias;
- personas con las que estará;
- interior/exterior;
- duración.

No todos deberán ser obligatorios.

---

# 33. Actividades

Debe existir un catálogo extensible.

Ejemplos:

```text
HOME
HOME_OFFICE
OFFICE
GYM
RUNNING
CASUAL_OUTING
DINNER
DATE
PARTY
FORMAL_EVENT
TRAVEL
WALK
```

---

# 34. Multi-activity Day

Una solicitud podrá contener varias actividades.

Ejemplo:

```text
Home Office
↓
Gym
↓
Dinner
```

El sistema deberá analizar si conviene:

- outfit independiente;
- reutilizar prendas;
- cambiar únicamente una parte;
- utilizar capas.

---

# 35. Clima

Cuando sea relevante, Closet AI deberá obtener:

- temperatura;
- mínima;
- máxima;
- sensación;
- lluvia;
- viento;
- humedad.

---

# 36. Ubicación

El sistema necesitará conocer una ubicación aproximada cuando el contexto meteorológico sea necesario.

La ubicación podrá proceder de:

- perfil;
- selección manual;
- ciudad;
- integración futura.

La ubicación precisa no será requisito del MVP.

---

# 37. Rule Engine

Antes de invocar IA deberá aplicarse una capa de reglas.

Debe eliminar prendas:

- no disponibles;
- de otro usuario;
- incompatibles con restricciones;
- inadecuadas para condiciones extremas;
- fuera de uso.

---

# 38. Recommendation Engine

Después del filtrado, el sistema deberá producir candidatos.

El Recommendation Engine podrá combinar:

```text
rules
+
scoring
+
AI reasoning
```

---

# 39. Outfit Score

Debe existir una medida que permita comparar recomendaciones.

Dimensiones iniciales:

```text
colorCompatibility
weatherSuitability
activitySuitability
userPreference
styleCompatibility
comfort
availability
recentUsage
```

---

# 40. Score final

Ejemplo:

```text
overallScore = 91/100
```

El algoritmo específico no queda definido por este PRD.

Debe poder evolucionar independientemente.

---

# 41. Número de recomendaciones

Por defecto:

```text
3 outfits
```

Debe ser configurable.

Cuando exista una opción claramente dominante podrá presentarse primero.

---

# 42. Explicación

Cada recomendación deberá incluir una explicación breve.

Ejemplo:

> Adecuado para una cena informal a 20 °C. La sobrecamisa proporciona una capa ligera y mantiene el estilo smart casual.

---

# 43. Selección

El usuario podrá:

- elegir outfit;
- rechazar;
- solicitar alternativa;
- sustituir una prenda.

---

# 44. Regeneración

El usuario podrá indicar:

> “Otra opción, pero sin botas.”

Esto deberá convertirse en una restricción contextual adicional.

---

# 45. Outfit persistence

Los outfits generados deberán persistirse al menos temporalmente para registrar:

- recomendación;
- selección;
- uso;
- feedback.

---

# 46. Outfit Status

```text
GENERATED
PRESENTED
SELECTED
WORN
REJECTED
CANCELLED
```

---

# 47. Artificial Intelligence Requirements

La IA deberá dividirse conceptualmente por capacidades.

No debe existir un único prompt para todas las funciones.

---

# 48. AI Capability — Style Profiler

Entrada:

- cuestionario;
- respuestas visuales;
- preferencias.

Salida:

```json
{
  "styleWeights": {},
  "preferredColors": [],
  "preferredFits": [],
  "confidence": 0
}
```

---

# 49. AI Capability — Garment Analyzer

Entrada:

- fotografías.

Salida estructurada.

Ejemplo:

```json
{
  "category": "OVERSHIRT",
  "primaryColor": "OLIVE",
  "pattern": "SOLID",
  "fit": "RELAXED",
  "confidence": 0.89
}
```

---

# 50. AI Capability — Outfit Stylist

Entrada:

```text
User profile
Eligible garments
Context
Weather
Preferences
Recent history
```

Salida:

```json
{
  "recommendations": []
}
```

Los IDs deberán proceder del conjunto entregado.

---

# 51. AI Capability — Laundry Advisor

Entrada:

- categoría;
- usos;
- material;
- actividad;
- condición.

Salida:

- recomendación;
- score;
- explicación.

---

# 52. AI Capability — Shopping Advisor

Entrada:

- inventario;
- utilización;
- estilo;
- huecos;
- presupuesto.

Salida:

- categorías;
- prioridad;
- razón;
- criterios de búsqueda.

---

# 53. Requisito de Structured Output

Todas las capacidades de IA consumidas programáticamente deberán devolver estructuras validables.

Preferiblemente:

```text
JSON Schema
```

La aplicación no deberá depender de parsear texto libre siempre que exista una decisión de negocio.

---

# 54. Validación de IA

El backend deberá validar:

- schema;
- IDs;
- usuario;
- estado;
- permisos;
- reglas.

Si el resultado no es válido:

```text
reject
retry
fallback
```

según corresponda.

---

# 55. Fallback sin IA

Las operaciones esenciales deberán funcionar aunque el proveedor de IA esté temporalmente indisponible.

Ejemplos:

- consultar guardarropa;
- cambiar estado;
- registrar uso;
- registrar lavado;
- consultar historial.

La generación inteligente podrá degradarse.

---

# 56. Outfit Visualization

Debe poder existir una imagen asociada con la recomendación.

El MVP podrá utilizar:

### Opción A

Composición con fotografías reales de las prendas.

### Opción B

Flat lay generado.

### Opción C

Maniquí.

La selección tecnológica deberá evaluar costo, fidelidad y complejidad.

---

# 57. Visualización — requisito importante

La imagen no debe sustituir los identificadores reales de las prendas.

Un outfit visual siempre deberá continuar vinculado a:

```text
GARMENT IDs
```

---

# 58. Telegram Integration

Closet AI deberá poder utilizar Telegram como canal asincrónico para:

- recibir outfit;
- ver imágenes;
- seleccionar;
- confirmar uso;
- responder feedback.

---

# 59. Notificación de outfit

Ejemplo:

```text
Cena informal — 20:00

[imagen]

Playera crema
Pantalón negro
Sobrecamisa oliva
Vans gris
```

Acciones:

```text
Usarlo
Otra opción
Cambiar prenda
```

---

# 60. Confirmación posterior

Posteriormente:

> ¿Usaste el outfit?

Opciones:

```text
Sí
No
Parcialmente
```

---

# 61. Alexa Integration

Alexa será una interfaz del sistema y no contendrá lógica principal de negocio.

Arquitectura funcional:

```text
Alexa
↓
Alexa Adapter
↓
Closet Application API
↓
Domain
```

---

# 62. Casos de uso Alexa

Debe soportar progresivamente:

### Outfit

> ¿Qué me pongo hoy?

### Contexto

> Hoy voy al gimnasio y después a cenar.

### Laundry

> Mañana voy a lavar ropa.

### Confirmation

> Sí usé el outfit.

---

# 63. Identificación por voz

Cuando Alexa proporcione identidad de hablante, el sistema podrá mapearla con un usuario.

Si no puede determinarlo, deberá solicitar:

> ¿Para quién es el outfit?

---

# 64. Echo Show

Debe contemplarse una interfaz visual futura para:

- outfit;
- fotografías;
- alternativas;
- botones.

No es requisito para completar el MVP del core.

---

# 65. Laundry Intelligence

El sistema deberá permitir decidir si una prenda:

```text
can be reused
should be washed
must be washed
```

---

# 66. Regla de lavado

La decisión nunca deberá depender únicamente del número de usos.

Debe poder considerar:

- categoría;
- material;
- actividad;
- sudor;
- temperatura;
- manchas;
- olor;
- preferencia del usuario.

---

# 67. Laundry Score

Deberá poder calcularse un indicador abstracto.

Ejemplo:

```text
0 → completamente limpia
100 → requiere lavado
```

Los rangos y pesos se definirán durante diseño.

---

# 68. Laundry Batch

El sistema podrá organizar lavado por compatibilidad.

Ejemplo:

```text
Darks
Lights
Delicates
Sportswear
```

---

# 69. Wash confirmation

El usuario deberá confirmar qué prendas fueron efectivamente lavadas.

El sistema no deberá inferirlo sólo porque fueron recomendadas.

---

# 70. Garment Lifecycle

Closet AI deberá mantener historial de:

```text
purchase
usage
washing
condition changes
repair
retirement
```

---

# 71. Condition Score

El producto podrá mantener una estimación de condición.

Variables:

- edad;
- usos;
- lavados;
- daños reportados;
- material;
- estado visual futuro.

---

# 72. Retiro

Una recomendación para retirar una prenda requerirá confirmación explícita.

Estados finales posibles:

```text
RETIRED
DONATED
DISCARDED
```

---

# 73. Cost per Wear

Cuando exista precio:

```text
costPerWear =
purchasePrice / wearCount
```

Deberá utilizarse como métrica analítica, no necesariamente como criterio único de recomendación.

---

# 74. Shopping Intelligence

El sistema deberá distinguir entre:

```text
quiero algo
```

y:

```text
realmente lo necesito
```

---

# 75. Gap Analysis

Debe poder analizar:

- frecuencia de actividades;
- categorías disponibles;
- combinabilidad;
- estado de prendas;
- utilización.

Resultado:

```text
Wardrobe gaps
```

---

# 76. Redundancy Detection

Ejemplo:

> Ya tienes cuatro playeras negras con función similar.

La plataforma podrá indicar que una compra tiene baja prioridad.

---

# 77. Purchase Evaluation

El usuario podrá proporcionar información de una posible compra.

El sistema deberá evaluar:

```text
compatibility
redundancy
coverage
price
potential outfits
priority
```

---

# 78. Compra externa

Closet AI no necesita procesar pagos.

El usuario podrá comprar en cualquier tienda.

Después deberá registrar la prenda adquirida.

---

# 79. Analytics

El sistema deberá preparar datos para analizar:

```text
wardrobe size
wear frequency
most used
least used
cost per wear
outfit acceptance
color usage
category usage
laundry frequency
```

---

# 80. North Star Metric

Se define provisionalmente:

## Outfit Usage Rate

```text
Outfits actually worn
/
Outfits selected
```

---

# 81. Métricas secundarias

### Recommendation Acceptance Rate

### Wardrobe Utilization Rate

### Garment Rotation

### Cost per Wear

### Recommendation Rejection Rate

### Laundry Prediction Acceptance

---

# 82. Dashboard futuro

Una pantalla podrá mostrar:

```text
Total garments
Most used garments
Unused garments
Average uses
Cost per wear
Current laundry
Wardrobe gaps
```

---

# 83. Datos históricos

Los eventos de uso y lavado deberán conservarse.

No deberá mantenerse únicamente el contador.

Ejemplo correcto:

```text
Garment
↓
Usage events
↓
Aggregate wear_count
```

---

# 84. Auditoría

Operaciones relevantes deberán guardar:

```text
created_at
updated_at
actor
source
```

`source` podrá identificar:

```text
WEB
TELEGRAM
ALEXA
SYSTEM
```

---

# 85. Requerimientos de seguridad

## SEC-001

Todo acceso a datos privados deberá requerir autenticación.

## SEC-002

Las imágenes deberán permanecer privadas.

## SEC-003

Cada petición deberá validar acceso al recurso.

## SEC-004

Las credenciales externas no deberán almacenarse en código.

## SEC-005

Tokens deberán protegerse.

---

# 86. Requerimientos de privacidad

La plataforma manejará datos como:

- fotografías;
- hábitos;
- preferencias;
- historial.

Debe existir capacidad futura para:

```text
export user data
delete user data
```

Aunque sea un producto personal.

---

# 87. Requerimiento de portabilidad

El usuario deberá poder conservar su información aunque cambien:

- proveedor de IA;
- plataforma de despliegue;
- proveedor de almacenamiento.

Los datos de dominio no deberán estar encerrados en formatos propietarios de IA.

---

# 88. Requerimiento de integración

Las integraciones externas deberán utilizar adaptadores.

Ejemplo:

```text
Domain
↑
Application
↑
Integration Adapter
↑
Telegram
```

---

# 89. API-first

El core deberá exponer sus capacidades mediante API.

Esto permitirá posteriormente conectar:

```text
Web
Mobile
Alexa
Telegram
Home Assistant
Shortcuts
```

---

# 90. Performance

Para el MVP:

### Operaciones CRUD

Objetivo:

```text
p95 < 500 ms
```

sin considerar uploads.

### Generación de outfit con IA

Objetivo razonable:

```text
< 10 seconds
```

pero la arquitectura debe soportar procesamiento más lento sin bloquear innecesariamente interfaces.

---

# 91. Procesos síncronos

Ejemplos:

- consultar prenda;
- marcar estado;
- seleccionar outfit;
- confirmar uso.

---

# 92. Procesos potencialmente asíncronos

Ejemplos:

- análisis de imagen;
- generación de imagen;
- recomendaciones complejas;
- notificaciones;
- analytics.

Esto deberá considerarse al seleccionar tecnología.

---

# 93. Consistencia

Operaciones que afecten múltiples elementos deberán conservar consistencia.

Ejemplo:

Confirmar un outfit con cuatro prendas debe:

```text
create usage events
+
update aggregate usage
+
update outfit status
```

de forma consistente.

---

# 94. Disponibilidad

El producto personal no necesita inicialmente infraestructura de alta disponibilidad empresarial.

Se priorizará:

```text
simplicity
recoverability
backup
```

sobre arquitecturas complejas.

---

# 95. Backup

Se requiere respaldo de:

- base;
- configuración;
- metadatos.

Las imágenes deberán utilizar almacenamiento con estrategia de recuperación adecuada.

---

# 96. Logs

Deberán existir logs estructurados que permitan conocer:

```text
request
user
operation
result
errors
external provider
latency
```

Sin registrar innecesariamente datos sensibles.

---

# 97. AI observability

Las llamadas de IA deberán registrar al menos:

```text
capability
provider
model
prompt_version
latency
tokens
cost
status
```

cuando el proveedor proporcione esos datos.

---

# 98. Prompt management

Los prompts deberán:

- estar versionados;
- ser identificables;
- evitar estar dispersos;
- permitir pruebas.

Ejemplo:

```text
OUTFIT_STYLIST_V1
GARMENT_ANALYZER_V1
STYLE_PROFILER_V1
```

---

# 99. AI evaluation

Deberá existir en el futuro un conjunto de ejemplos de prueba para comparar cambios de prompts/modelos.

Ejemplo:

```text
100 outfit scenarios
```

y evaluar:

- validity;
- garment hallucinations;
- style relevance;
- context relevance.

---

# 100. Error handling

Si el sistema no puede producir outfit válido:

No deberá inventar uno.

Debe responder, por ejemplo:

> No encuentro suficientes prendas disponibles para generar una combinación válida.

Y explicar el bloqueo cuando sea posible.

---

# 101. Degradación controlada

Si falla clima:

```text
usar contexto sin clima
```

previa indicación.

Si falla generación visual:

```text
devolver outfit textual
```

Si falla Telegram:

```text
el outfit permanece disponible en web
```

---

# 102. Accesibilidad

La interfaz deberá tener:

- textos legibles;
- botones claros;
- imágenes acompañadas por descripción;
- navegación compatible con tablet.

---

# 103. Diseño responsive

Debe soportar al menos:

```text
Mobile
Tablet
Desktop
```

Tablet será especialmente relevante por la experiencia doméstica.

---

# 104. Interfaz principal propuesta

Pantalla Home:

```text
Good morning

[ Generate outfit ]

Weather

Today's activities

Current laundry

Recent outfits
```

---

# 105. Digital Closet UI

Vista principal mediante grid.

Cada tarjeta:

```text
Photo
Category
Color
Status
Last use
```

Filtros:

```text
category
color
status
season
brand
```

---

# 106. Outfit UI

Mostrar:

- fotografía;
- prendas;
- motivo;
- score;
- clima;
- acciones.

Acciones:

```text
Wear this
Alternative
Replace item
Save
```

---

# 107. Laundry UI

Debe mostrar:

```text
Laundry bin
Reusable
Wash recommendations
Batches
```

---

# 108. Product constraints

El producto inicial tendrá recursos limitados.

Por ello:

- evitar infraestructura innecesaria;
- evitar microservicios prematuros;
- evitar entrenamiento de modelos propios;
- utilizar APIs/modelos existentes;
- mantener posibilidad de sustituir proveedores.

---

# 109. No objetivos iniciales

No se busca:

- competir comercialmente;
- construir una red social;
- desarrollar modelos fundacionales;
- fabricar hardware;
- desarrollar un marketplace;
- vender ropa;
- entrenar sistemas de computer vision desde cero.

---

# 110. Alcance del MVP técnico

El MVP debe demostrar:

```text
User
↓
Wardrobe
↓
Context
↓
Outfit Recommendation
↓
Selection
↓
Usage
```

---

# 111. Funcionalidades MVP obligatorias

## MVP-001

Autenticación.

## MVP-002

Household.

## MVP-003

Dos usuarios.

## MVP-004

Perfil básico.

## MVP-005

CRUD de prendas.

## MVP-006

Fotografía de prenda.

## MVP-007

Estados.

## MVP-008

Consulta de prendas disponibles.

## MVP-009

Contexto manual.

## MVP-010

Generación de outfits.

## MVP-011

Selección.

## MVP-012

Confirmación de uso.

## MVP-013

Historial de uso.

## MVP-014

Feedback básico.

---

# 112. Funcionalidades recomendadas para MVP+

Después del MVP:

```text
Weather integration
Garment Vision AI
Telegram
Visualization
Style questionnaire
```

---

# 113. Funcionalidades posteriores

```text
Alexa
Laundry Intelligence
Shopping Intelligence
Travel
Adaptive learning
Echo Show
```

---

# 114. Motivo para posponer Alexa

Alexa depende de un core funcional.

El flujo deberá funcionar primero por API/web:

```text
request outfit
↓
get recommendation
```

Posteriormente Alexa consumirá el mismo caso de uso.

Esto reduce considerablemente el riesgo de arquitectura.

---

# 115. Motivo para posponer generación hiperrealista

La visualización generativa:

- consume recursos;
- introduce latencia;
- aumenta costo;
- puede modificar visualmente prendas.

El sistema debe demostrar primero que su recomendación textual funciona.

---

# 116. User Story — Registrar prenda

```text
Como usuario
quiero registrar una prenda
para que Closet AI pueda utilizarla en futuras recomendaciones.
```

### Acceptance Criteria

- la prenda pertenece al usuario;
- tiene categoría;
- tiene color;
- tiene estado;
- puede tener fotografía;
- aparece en el guardarropa.

---

# 117. User Story — Solicitar outfit

```text
Como usuario
quiero describir una actividad
para recibir outfits apropiados utilizando mis prendas disponibles.
```

### Acceptance Criteria

- sólo utiliza prendas elegibles;
- únicamente del usuario;
- devuelve IDs;
- devuelve explicación;
- permite seleccionar.

---

# 118. User Story — Confirmar uso

```text
Como usuario
quiero indicar que utilicé un outfit
para actualizar correctamente mi historial.
```

### Acceptance Criteria

- outfit pasa a WORN;
- crea usos;
- incrementa contadores;
- actualiza fecha de último uso.

---

# 119. User Story — Rechazar outfit

```text
Como usuario
quiero rechazar una recomendación
para que el sistema pueda aprender mis preferencias.
```

---

# 120. Definition of MVP Success

Se considerará exitoso si durante pruebas reales:

1. ambos usuarios pueden tener guardarropas independientes;
2. las prendas se registran correctamente;
3. las recomendaciones nunca utilizan prendas inexistentes;
4. no utilizan prendas no disponibles;
5. se puede completar el flujo diario;
6. el historial refleja correctamente lo utilizado.

---

# 121. Restricciones tecnológicas derivadas del producto

La tecnología seleccionada deberá soportar obligatoriamente:

### Backend

- APIs HTTP;
- autenticación;
- lógica transaccional;
- persistencia;
- jobs;
- integraciones externas;
- manejo JSON;
- validación de schemas.

### Frontend

- responsive;
- PWA;
- imágenes;
- interacción tablet.

### Database

- relaciones;
- historial;
- transacciones;
- consultas;
- JSON opcional.

### Storage

- archivos privados;
- fotografías;
- URLs firmadas o equivalentes.

### AI

- text generation;
- structured outputs;
- vision;
- image support deseable.

---

# 122. Requerimientos que impactan decisión de backend

La tecnología backend deberá funcionar bien para:

```text
REST APIs
domain modeling
transactions
scheduled jobs
external APIs
OAuth
webhooks
JSON Schema validation
background processing
tests
```

No se requiere inicialmente procesamiento de millones de solicitudes.

---

# 123. Requerimientos que impactan base de datos

Se necesitan relaciones como:

```text
USER
1:N
GARMENT

USER
1:N
OUTFIT

OUTFIT
N:M
GARMENT
```

Además:

```text
GARMENT
1:N
USAGE_EVENT

GARMENT
1:N
WASH_EVENT
```

Esto favorece una base relacional.

---

# 124. Requerimientos que impactan almacenamiento

Las imágenes pueden aumentar significativamente.

Por lo tanto:

```text
database != image storage
```

La base deberá guardar:

```text
metadata + object reference
```

---

# 125. Requerimientos que impactan IA

No se necesita inicialmente:

```text
fine tuning
own model hosting
GPU infrastructure
```

Se necesita:

```text
API-based models
structured output
vision
reasoning
```

---

# 126. Requerimientos que impactan hosting

Debe poder ejecutarse económicamente para dos usuarios.

Características deseables:

```text
containers
managed DB
object storage
HTTPS
background jobs
secrets
```

---

# 127. Requerimientos que impactan integración Alexa

El backend deberá ser accesible mediante HTTPS públicamente cuando se integre Alexa.

Por ello una instalación exclusivamente LAN no será suficiente salvo que posteriormente se introduzca infraestructura adicional.

---

# 128. Requerimientos que impactan Telegram

El sistema deberá poder:

```text
receive webhook
send message
send image
handle callback
```

---

# 129. Requerimientos para arquitectura

El sistema deberá favorecer:

```text
modular monolith
```

al menos durante MVP.

Los módulos podrán extraerse posteriormente.

---

# 130. Criterios para seleccionar stack

La evaluación tecnológica deberá considerar:

| Criterio | Peso sugerido |
|---|---:|
| Velocidad de desarrollo | 20% |
| Experiencia del desarrollador | 20% |
| Ecosistema IA | 15% |
| Mantenibilidad | 15% |
| Integraciones | 10% |
| Costo | 10% |
| Escalabilidad futura | 5% |
| Portabilidad | 5% |

---

# 131. Decisiones tecnológicas pendientes

Después de este PRD deberán evaluarse explícitamente:

```text
DEC-001 Backend language/framework
DEC-002 Frontend framework
DEC-003 Database
DEC-004 Authentication
DEC-005 Object storage
DEC-006 AI provider
DEC-007 Image generation
DEC-008 Weather provider
DEC-009 Hosting
DEC-010 Job / queue strategy
DEC-011 Observability
DEC-012 CI/CD
```

---

# 132. Comparación tecnológica requerida

La siguiente fase deberá comparar por lo menos dos alternativas de backend.

Por ejemplo:

```text
Java / Spring Boot
vs
TypeScript / NestJS
```

La comparación deberá hacerse contra los requisitos de este PRD.

No únicamente con ventajas genéricas.

---

# 133. Preguntas que deberá contestar la decisión tecnológica

### Backend

- ¿permite desarrollar rápido?
- ¿maneja bien dominio complejo?
- ¿qué tan fácil integra IA?
- ¿maneja jobs?
- ¿qué tan fácil desplegarlo?

### Frontend

- ¿funciona bien como PWA?
- ¿tablet?
- ¿ecosistema UI?

### Database

- ¿soporta relaciones?
- ¿transacciones?
- ¿historial?
- ¿JSON?

### IA

- ¿structured outputs?
- ¿vision?
- ¿image generation?
- ¿costos?

---

# 134. Decisiones que no deben bloquear el MVP

No es necesario resolver inicialmente:

- vector database;
- embeddings;
- fine tuning;
- Kubernetes;
- microservices;
- Kafka;
- data lake;
- machine learning propio.

Sólo deberán incorporarse cuando un requerimiento real los justifique.

---

# 135. Technical North Star

La arquitectura deberá intentar mantener esta separación:

```text
Interfaces
    ↓
Application
    ↓
Domain
    ↓
Ports
    ↓
Infrastructure
```

La IA, Telegram, Alexa, clima y almacenamiento deberán situarse detrás de puertos/adaptadores.

---

# 136. Estrategia de entrega

La implementación deberá realizarse mediante vertical slices.

Primer slice:

```text
Create user
↓
Create garment
↓
List garments
```

Segundo:

```text
Generate simple outfit
```

Tercero:

```text
Select
↓
Confirm use
```

Cuarto:

```text
Weather
```

Quinto:

```text
AI
```

---

# 137. Primera versión sin IA

Es recomendable que el primer Outfit Engine pueda funcionar con reglas simples.

Ejemplo:

```text
choose available top
+
compatible bottom
+
footwear
```

Esto permite probar el dominio antes de añadir LLM.

---

# 138. Introducción progresiva de IA

Orden recomendado:

```text
1. Style analysis
2. Garment analysis
3. Outfit ranking
4. Natural-language interpretation
5. Visualization
6. Laundry intelligence
7. Shopping intelligence
```

---

# 139. Principio de costo

Cada funcionalidad con IA deberá justificar su costo por interacción.

El sistema deberá evitar generación innecesaria.

Ejemplo:

Una imagen del mismo outfit no debería regenerarse si ya existe y continúa siendo válida.

---

# 140. Cache

Deberá contemplarse cache para:

- clima;
- imágenes;
- resultados temporales.

No es obligatorio utilizar una tecnología específica durante primera implementación.

---

# 141. Procesamiento en segundo plano

La arquitectura deberá permitir jobs para:

```text
image processing
notifications
analytics
maintenance
```

Inicialmente podrían ejecutarse mediante mecanismos simples.

No es obligatorio introducir una cola distribuida.

---

# 142. Local development

Todo desarrollador/IA deberá poder iniciar el proyecto localmente con una cantidad mínima de comandos.

Idealmente:

```text
clone
configure .env
docker compose up
```

---

# 143. Entornos

Se requieren:

```text
local
development
production
```

---

# 144. Secrets

Deben existir mecanismos separados para:

- IA;
- Telegram;
- Alexa;
- database;
- object storage;
- weather.

Nunca deberán almacenarse en Git.

---

# 145. Versionado API

Cuando sea necesario:

```text
/api/v1
```

Evitar versionar antes de tener contratos públicos estables si introduce complejidad innecesaria.

---

# 146. Testing Requirements

Como mínimo:

### Unit

Reglas de dominio.

### Integration

Database y adapters principales.

### API

Flujos críticos.

### AI Contract Tests

Validación del structured output.

---

# 147. Casos críticos para pruebas

Debe probarse explícitamente:

```text
garment from wrong user
dirty garment
garment unavailable
invalid AI garment ID
outfit partially used
duplicate usage confirmation
```

---

# 148. Idempotencia

Operaciones como:

> confirmar uso

deberán evitar duplicar registros si son ejecutadas dos veces accidentalmente.

---

# 149. Estado y eventos

Cuando tenga sentido, se recomienda conservar:

```text
current state
+
event history
```

No se requiere implementar Event Sourcing.

---

# 150. Criterios para evitar sobreingeniería

Una nueva tecnología sólo debe incorporarse cuando:

1. resuelve un requisito concreto;
2. la solución actual no lo resuelve adecuadamente;
3. la complejidad añadida se justifica.

---

# 151. Roadmap de producto

## Release 0 — Foundation

- repositorio;
- environments;
- backend;
- frontend;
- database;
- auth.

## Release 1 — Digital Closet

- household;
- users;
- garments;
- photos;
- states.

## Release 2 — Outfit MVP

- context;
- basic engine;
- recommendations;
- usage.

## Release 3 — AI Stylist

- LLM;
- ranking;
- explanations;
- language understanding.

## Release 4 — Vision

- garment analysis.

## Release 5 — Weather

- automatic weather.

## Release 6 — Telegram

- notifications;
- interaction.

## Release 7 — Visual Outfit

- image generation/composition.

## Release 8 — Alexa

- voice interaction.

## Release 9 — Laundry

- laundry intelligence.

## Release 10 — Shopping

- gap analysis;
- purchase evaluation.

---

# 152. Definition of Ready para desarrollo

Una historia estará lista cuando exista:

- objetivo;
- reglas;
- criterios de aceptación;
- dependencias;
- modelo afectado;
- contrato esperado.

---

# 153. Definition of Done

Una historia estará completada cuando:

- código implementado;
- pruebas;
- validaciones;
- logs;
- documentación;
- integración;
- criterios cumplidos.

---

# 154. Resultado esperado de este PRD

Al finalizar este documento ya existen suficientes requisitos para seleccionar:

```text
Backend
Frontend
Database
Storage
AI
Authentication
Hosting
Integrations
```

La selección tecnológica deberá realizarse como un proceso separado y documentado.

---

# 155. Próximo documento

El siguiente entregable deberá ser:

> **Technology Decision & Architecture Assessment v1.0**

Ese documento deberá comparar tecnologías contra los requisitos concretos de Closet AI.

Como mínimo deberá analizar:

```text
Java + Spring Boot
vs
TypeScript + NestJS
```

y definir una propuesta de:

```text
Frontend
Database
Storage
Auth
AI Provider
Weather Provider
Hosting
Deployment
Background Jobs
Observability
```

---

# 156. Pregunta arquitectónica principal

La siguiente fase deberá responder:

> ¿Cuál es el stack tecnológico que permite construir Closet AI con la menor complejidad inicial posible, manteniendo buena capacidad de integración con IA, Alexa, Telegram y futuras extensiones sin comprometer el dominio?

---

# 157. Criterio de cierre del PRD v1.0

El PRD se considera suficientemente definido para comenzar selección tecnológica cuando:

- el MVP está delimitado;
- las capacidades futuras están diferenciadas;
- las interfaces externas están identificadas;
- las principales entidades están identificadas;
- existen restricciones de seguridad;
- existen requisitos de IA;
- existen requisitos de integración;
- existen requisitos de despliegue.

Estas condiciones están cubiertas en la presente versión.

---

# 158. Conclusión

Closet AI requiere una tecnología capaz de combinar principalmente cuatro tipos de cargas:

```text
Transactional application
+
AI orchestration
+
Image management
+
External integrations
```

La complejidad principal del producto estará en el dominio y en mantener el estado correcto del guardarropa, no en la escala de infraestructura.

Por ello, la decisión tecnológica deberá favorecer:

```text
developer productivity
domain clarity
AI integration
simple deployment
low operating cost
future extensibility
```

por encima de arquitecturas orientadas prematuramente a alta escala.

---

**Fin del Product Requirements Document — Closet AI PRD v1.0**