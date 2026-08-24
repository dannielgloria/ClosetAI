# Documento de Definición del Proyecto v1.0

## Closet AI — Personal Wardrobe Intelligence Platform

**Versión:** 1.0  
**Fecha:** 23 de agosto de 2026  
**Estado:** Definición inicial  
**Tipo de proyecto:** Desarrollo personal / Inteligencia Artificial / Smart Home / Fashion Tech  
**Usuarios iniciales:** 2 personas  
**Plataformas objetivo:** Web/PWA, tablet, Alexa/Echo/Echo Show y Telegram

---

# 1. Resumen ejecutivo

**Closet AI** es una plataforma personal de inteligencia de guardarropa diseñada para administrar de forma inteligente el ciclo completo de la ropa de una persona: definición de estilo, planeación del guardarropa, compra, digitalización, combinación, uso, lavado, mantenimiento, desgaste y sustitución.

El sistema tendrá inicialmente dos usuarios pertenecientes al mismo hogar y deberá mantener perfiles, preferencias, prendas, historial y recomendaciones completamente independientes.

Closet AI utilizará inteligencia artificial para comprender el estilo de cada usuario, analizar prendas mediante imágenes, generar combinaciones de ropa, interpretar lenguaje natural, considerar clima y contexto, aprender de elecciones anteriores y proporcionar recomendaciones personalizadas.

La interacción podrá realizarse mediante:

- aplicación web o PWA;
- interfaz optimizada para tablet;
- dispositivos Amazon Alexa/Echo;
- dispositivos Echo Show;
- Telegram.

Ejemplo de interacción objetivo:

> “Alexa, dile a mi stylist que hoy voy al gimnasio a las cinco, después voy a bañarme y a las ocho tengo una cena informal.”

El sistema deberá:

1. identificar al usuario;
2. interpretar las actividades;
3. consultar el clima;
4. consultar las prendas disponibles;
5. generar uno o varios outfits;
6. evitar recomendar prendas sucias o no disponibles;
7. explicar la recomendación;
8. mostrar o enviar una representación visual;
9. registrar cuál opción fue seleccionada;
10. preguntar posteriormente si fue utilizada;
11. actualizar el estado de las prendas;
12. determinar cuáles requieren lavado;
13. aprender del comportamiento del usuario.

Closet AI no será únicamente un chatbot o generador de imágenes.

La plataforma deberá funcionar como un **sistema de inteligencia personal de vestimenta basado en información estructurada y persistente**.

---

# 2. Visión del producto

Crear un asistente personal capaz de conocer el guardarropa de sus usuarios con suficiente profundidad para responder preguntas como:

- ¿Qué me pongo hoy?
- ¿Qué debería ponerme para esta actividad?
- ¿Qué puedo usar considerando el clima?
- ¿Qué puedo reutilizar sin lavar?
- ¿Qué ropa debería lavar?
- ¿Qué ropa llevo demasiado tiempo sin utilizar?
- ¿Qué ropa debería reemplazar?
- ¿Qué prendas realmente me hacen falta?
- ¿Esta compra combina con lo que ya tengo?
- ¿Qué debería comprar para completar mi guardarropa?
- ¿Qué prendas debería llevar a un viaje?
- ¿Qué outfit utilizo si tengo varias actividades durante el mismo día?

La visión final es que Closet AI pueda administrar el guardarropa como un sistema dinámico y no como un catálogo estático.

---

# 3. Definición del producto

Closet AI se define como:

> **Una plataforma personal de Wardrobe Intelligence basada en inteligencia artificial para administrar el ciclo completo del guardarropa, utilizando información estructurada sobre las prendas, perfil personal, preferencias, contexto, clima, actividades e historial de uso para generar recomendaciones personalizadas y aprender continuamente del comportamiento de cada usuario.**

---

# 4. Problema que busca resolver

Las personas suelen acumular ropa sin disponer de información estructurada sobre:

- qué poseen;
- qué utilizan realmente;
- qué combina;
- cuándo fue utilizada una prenda;
- cuándo se lavó;
- cuánto desgaste tiene;
- cuánto costó;
- qué prendas son redundantes;
- qué prendas hacen falta;
- qué prendas deberían sustituirse.

Los sistemas tradicionales de guardarropa digital suelen limitarse a registrar fotografías y permitir combinaciones manuales.

Closet AI pretende añadir una capa de inteligencia capaz de tomar decisiones considerando simultáneamente:

- inventario;
- disponibilidad;
- estilo;
- colorimetría;
- morfología;
- preferencias;
- contexto;
- temperatura;
- clima;
- actividad;
- formalidad;
- historial;
- frecuencia de utilización;
- frecuencia de lavado;
- desgaste;
- compras futuras.

---

# 5. Objetivo general

Diseñar e implementar una plataforma inteligente que permita a dos usuarios administrar digitalmente su guardarropa y obtener recomendaciones personalizadas de vestimenta mediante inteligencia artificial, interacción conversacional, análisis contextual y aprendizaje progresivo.

---

# 6. Objetivos específicos

Closet AI deberá permitir:

1. Crear perfiles independientes para múltiples usuarios dentro de un hogar.

2. Determinar el estilo predominante de cada usuario mediante un cuestionario dinámico.

3. Registrar características relevantes como:
   - tallas;
   - proporciones;
   - colores preferidos;
   - estilo;
   - formalidad;
   - actividades habituales;
   - frecuencia de lavado;
   - presupuesto.

4. Generar una propuesta inicial de guardarropa.

5. Registrar prendas mediante:
   - formulario manual;
   - fotografía;
   - análisis mediante visión artificial.

6. Mantener el estado operativo de cada prenda.

7. Generar outfits considerando contexto y prendas reales disponibles.

8. Evitar que la IA invente prendas.

9. Integrar información meteorológica.

10. Permitir actividades múltiples en un mismo día.

11. Optimizar reutilización de prendas cuando sea conveniente.

12. Registrar outfits utilizados.

13. Administrar ciclos de lavado.

14. Registrar desgaste y condición.

15. Calcular métricas como coste por uso.

16. Aprender de aceptación y rechazo de recomendaciones.

17. Generar representaciones visuales de los outfits.

18. Interactuar mediante voz utilizando Alexa.

19. Enviar recomendaciones mediante Telegram.

20. Recomendar futuras compras basándose en huecos reales del guardarropa.

---

# 7. Principios fundamentales del producto

## 7.1 La base de datos es la fuente de verdad

La inteligencia artificial nunca deberá inventar información sobre prendas existentes.

La IA únicamente podrá recomendar prendas cuyos identificadores hayan sido previamente recuperados del inventario.

Ejemplo correcto:

```json
{
  "top": "GARMENT-00031",
  "bottom": "GARMENT-00052",
  "shoes": "GARMENT-00110"
}
```

Posteriormente, el sistema puede convertir estos identificadores en lenguaje natural.

---

## 7.2 Separar reglas determinísticas e inteligencia artificial

Las reglas objetivas deberán aplicarse antes de consultar al modelo generativo.

Ejemplo:

Una prenda marcada como:

```text
LAUNDRY_BIN
```

deberá descartarse antes de generar recomendaciones.

La IA no deberá decidir si una prenda sucia está disponible.

---

## 7.3 Human in the Loop

El usuario deberá conservar siempre la decisión final.

La inteligencia artificial podrá:

- recomendar;
- clasificar;
- predecir;
- sugerir;
- detectar.

No deberá automáticamente:

- eliminar prendas;
- marcar una prenda como desechada;
- comprar productos;
- asumir que una prenda fue utilizada;
- asumir que una prenda fue lavada.

Estas acciones requerirán confirmación.

---

## 7.4 Explicabilidad

Toda recomendación importante deberá poder explicar:

- por qué fue seleccionada;
- qué condiciones fueron consideradas;
- qué alternativas existen.

---

## 7.5 Privacidad

La información personal, fotografías, preferencias y hábitos deberán considerarse datos privados.

Inicialmente, el sistema estará diseñado para uso personal y no requerirá funcionalidades sociales.

---

# 8. Usuarios y modelo Household

La primera versión deberá contemplar:

```text
HOUSEHOLD
│
├── USER_A
│
└── USER_B
```

Cada usuario tendrá información independiente.

Nunca deberá existir contaminación de recomendaciones entre perfiles.

Cada prenda tendrá obligatoriamente un propietario.

---

# 9. Perfil del usuario

Cada usuario deberá contar con los siguientes grupos de información.

## 9.1 Datos generales

- nombre;
- alias;
- edad aproximada;
- sexo o preferencia de prendas;
- estatura;
- peso opcional;
- talla superior;
- talla inferior;
- talla de calzado.

---

# 10. Perfil corporal

Podrá contener:

- estatura;
- complexión;
- proporción torso/pierna;
- anchura de hombros;
- cintura;
- tipo de cuerpo;
- fit preferido.

Las características físicas deberán utilizarse exclusivamente para mejorar proporciones, ajuste y recomendaciones.

---

# 11. Perfil de color

Deberá contener:

- colores favoritos;
- colores rechazados;
- colores principales;
- colores secundarios;
- neutros;
- combinaciones preferidas;
- temperatura de color estimada;
- nivel de contraste.

La colorimetría podrá obtenerse mediante:

1. cuestionario;
2. fotografías opcionales;
3. análisis de imagen;
4. corrección manual.

---

# 12. Perfil estilístico

El usuario no deberá limitarse necesariamente a una sola categoría.

Ejemplo:

```text
Smart Casual       40%
Minimalista        30%
Streetwear         20%
Athleisure         10%
```

Los porcentajes podrán cambiar con el tiempo.

---

# 13. Cuestionario inicial

El onboarding deberá incluir un cuestionario dinámico.

## Áreas a evaluar

- preferencias visuales;
- colores;
- tipos de prendas;
- siluetas;
- formalidad;
- comodidad;
- calzado;
- accesorios;
- frecuencia de actividades;
- clima habitual;
- frecuencia de lavado;
- presupuesto;
- tiendas;
- marcas;
- tolerancia a experimentar.

---

# 14. Cuestionario visual

Siempre que sea posible deberán utilizarse comparaciones visuales.

Ejemplo:

```text
LOOK A
Minimalista

VS

LOOK B
Streetwear
```

Pregunta:

> ¿Cuál utilizarías?

Las respuestas deberán alimentar un modelo de preferencias.

---

# 15. Perfil de actividades

Cada usuario podrá definir la frecuencia aproximada de actividades.

Ejemplo:

```text
Home office                  40%
Salidas casuales             20%
Restaurantes / citas         15%
Ejercicio                    10%
Viajes                        8%
Oficina                       5%
Eventos formales              2%
```

Esta información deberá influir en:

- construcción del guardarropa;
- compras;
- número de prendas;
- distribución entre categorías.

---

# 16. Generador inicial de guardarropa

Después del onboarding, Closet AI deberá poder generar una propuesta de guardarropa.

Entradas:

```text
Perfil
+
Estilo
+
Clima
+
Actividades
+
Presupuesto
+
Frecuencia de lavado
+
Preferencias
```

Salida:

```text
Guardarropa objetivo
```

---

# 17. Prioridad de compra

Cada prenda recomendada deberá clasificarse:

```text
P0 — esencial
P1 — altamente recomendable
P2 — complementaria
P3 — opcional
```

Esto permitirá construir gradualmente el guardarropa.

---

# 18. Inventario digital

Cada prenda registrada deberá contar con un identificador único.

Ejemplo:

```text
GARMENT-000001
```

---

# 19. Información de una prenda

Una entidad `GARMENT` deberá poder contener:

```text
ID
owner
category
subcategory
brand
model
color
secondary_colors
pattern
material
fit
size
season
weather_range
formality
purchase_date
purchase_price
currency
store
wash_instructions
condition
status
wear_count
wash_count
last_worn
last_washed
photo
```

---

# 20. Categorías iniciales

Ejemplo:

```text
TOP
BOTTOM
OUTERWEAR
FOOTWEAR
UNDERWEAR
ACCESSORY
SPORTSWEAR
FORMALWEAR
SLEEPWEAR
```

---

# 21. Subcategorías

Ejemplos:

```text
T_SHIRT
POLO
SHIRT
OVERSHIRT
HOODIE
SWEATER
JEANS
CHINO
SHORTS
JOGGER
JACKET
COAT
SNEAKERS
BOOTS
DRESS_SHOES
```

Las categorías deberán mantenerse en catálogos configurables.

---

# 22. Registro mediante fotografía

Al cargar una fotografía, un servicio de visión artificial deberá intentar identificar:

- tipo de prenda;
- color;
- colores secundarios;
- patrón;
- material probable;
- formalidad;
- temporada;
- fit aproximado.

El resultado deberá mostrarse al usuario antes de ser confirmado.

---

# 23. Estados de las prendas

Inicialmente se consideran los siguientes estados:

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

# 24. Máquina de estados

Ejemplo:

```text
CLEAN_AVAILABLE
      ↓
      USED
      ↓
WORN_REUSABLE
  ↙          ↘
USE AGAIN    LAUNDRY_BIN
                 ↓
              WASHING
                 ↓
              DRYING
                 ↓
        CLEAN_PENDING_STORAGE
                 ↓
          CLEAN_AVAILABLE
```

---

# 25. Motor de recomendaciones

El motor de outfits deberá componerse de dos etapas.

## Etapa 1 — Filtrado determinístico

Eliminar prendas que:

- no pertenezcan al usuario;
- estén sucias;
- estén lavándose;
- estén secándose;
- estén reparándose;
- no sean adecuadas para la actividad;
- no sean adecuadas al clima;
- no cumplan restricciones explícitas.

---

# 26. Etapa 2 — AI Stylist

La IA analizará las opciones restantes considerando:

- compatibilidad de colores;
- estilo;
- proporciones;
- formalidad;
- temperatura;
- lluvia;
- actividad;
- comodidad;
- historial;
- preferencias;
- repetición;
- frecuencia de uso.

---

# 27. Outfit Score

Cada outfit podrá tener puntuaciones parciales.

Ejemplo:

```text
Color                    92
Weather                  96
Activity                 95
Style                    91
Preference               88
Availability            100
Comfort                  94
Recent repetition        74
```

Posteriormente:

```text
Overall score: 91/100
```

---

# 28. Recomendaciones múltiples

Por defecto el sistema debería poder proporcionar:

```text
LOOK A
LOOK B
LOOK C
```

El número de recomendaciones será configurable.

---

# 29. Actividades múltiples

Closet AI deberá permitir solicitudes como:

> “Hoy voy a trabajar desde casa, después iré al gimnasio y por la noche tendré una cena.”

El sistema deberá determinar si:

1. requiere tres outfits;
2. pueden reutilizarse ciertas prendas;
3. basta con cambiar algunas piezas;
4. conviene usar capas.

---

# 30. Optimización de outfits

Una recomendación podrá optimizarse según distintos objetivos.

Ejemplos:

```text
COMFORT
STYLE
MINIMUM_CLOTHES
MINIMUM_LAUNDRY
FORMALITY
TRAVEL
RAIN
HEAT
COLD
```

---

# 31. Context Engine

Deberá existir un módulo encargado de construir el contexto de recomendación.

Ejemplo:

```json
{
  "userId": "USR-001",
  "date": "2026-09-17",
  "activities": [
    {
      "type": "GYM",
      "time": "17:00"
    },
    {
      "type": "CASUAL_DINNER",
      "time": "20:00"
    }
  ],
  "weather": {
    "minTemperature": 14,
    "maxTemperature": 23,
    "rainProbability": 45
  }
}
```

---

# 32. Integración meteorológica

El sistema deberá obtener información como:

- temperatura actual;
- temperatura máxima;
- temperatura mínima;
- sensación térmica;
- probabilidad de lluvia;
- viento;
- humedad.

El proveedor específico se definirá durante diseño técnico.

---

# 33. Outfit Visualization

El sistema deberá permitir representar visualmente un outfit.

Tres niveles posibles:

### Nivel 1

Flat lay.

### Nivel 2

Maniquí genérico.

### Nivel 3

Representación personalizada basada en características del usuario.

El MVP deberá priorizar Nivel 1 o Nivel 2.

---

# 34. Registro de outfits

Entidad conceptual:

```text
OUTFIT
```

Deberá almacenar:

```text
outfit_id
user_id
created_at
context
garments
score
selected
used
feedback
visualization
```

---

# 35. Estados de outfit

```text
GENERATED
PROPOSED
SELECTED
WORN
REJECTED
CANCELLED
```

---

# 36. Registro de utilización

Una prenda no deberá considerarse usada solamente porque haya sido recomendada.

El contador deberá incrementarse únicamente después de confirmación.

```text
wear_count += 1
```

---

# 37. Feedback

El usuario podrá indicar:

- me gustó;
- no me gustó;
- demasiado formal;
- demasiado informal;
- demasiado caliente;
- demasiado frío;
- incómodo;
- combinación incorrecta;
- cambiar una prenda.

---

# 38. Feedback implícito

Closet AI también deberá registrar:

```text
número de veces recomendado
número de veces seleccionado
número de veces utilizado
número de veces rechazado
```

Esto permitirá calcular tasas de aceptación.

---

# 39. Motor de aprendizaje

Cada interacción deberá alimentar un modelo de preferencias.

Ejemplo:

```text
Olive + Black
recommendations: 12
accepted: 10
acceptance_rate: 83%
```

---

# 40. Laundry Intelligence

Closet AI deberá gestionar cuándo conviene lavar una prenda.

No todas las prendas deberán lavarse después de un uso.

---

# 41. Variables de Laundry Score

El cálculo podrá considerar:

- categoría;
- material;
- número de usos;
- horas de uso;
- actividad;
- sudor estimado;
- temperatura;
- manchas reportadas;
- olores reportados;
- recomendaciones del fabricante.

---

# 42. Laundry Score

Ejemplo:

```text
Garment: pantalón negro

Uses since wash: 4
Approximate wear: 25 h
Intense activity: no
Stains: no
Material: cotton

Laundry score: 72/100
```

Recomendación:

> Puede utilizarse una vez más antes de lavar.

---

# 43. Día de lavado

El usuario podrá indicar:

> “Mañana voy a lavar.”

El sistema deberá identificar:

```text
LAUNDRY_BIN
+
WORN_REUSABLE cercanos al límite
```

---

# 44. Laundry Batch

Deberá poder generar lotes.

Ejemplo:

```text
BATCH-001 — Dark clothes
BATCH-002 — Light clothes
BATCH-003 — Delicates
```

---

# 45. Confirmación de lavado

Ejemplo:

> “Ya lavé la carga de ropa oscura.”

El sistema deberá actualizar las prendas correspondientes.

---

# 46. Garment Condition

Cada prenda deberá mantener una evaluación aproximada de condición.

Variables:

- antigüedad;
- usos;
- lavados;
- material;
- manchas;
- decoloración;
- deformación;
- roturas;
- feedback manual.

---

# 47. Condition Score

Ejemplo:

```text
Condition Score: 43/100
```

Cuando una prenda se acerque a un límite, Closet AI podrá solicitar revisión.

---

# 48. Retiro de una prenda

La IA nunca deberá eliminar automáticamente una prenda.

Opciones:

```text
KEEP
REPAIR
DONATE
RETIRE
DISCARD
```

---

# 49. Cost per Wear

Si existe precio de compra:

```text
cost_per_wear =
purchase_price / wear_count
```

Ejemplo:

```text
Precio: $699
Usos: 63

Costo por uso:
$11.09
```

---

# 50. Shopping Intelligence

Closet AI deberá detectar:

- huecos;
- redundancias;
- prendas poco utilizadas;
- categorías insuficientes;
- necesidades derivadas de actividades.

---

# 51. Wishlist

Entidad:

```text
SHOPPING_ITEM
```

Información:

```text
category
preferred_color
preferred_material
preferred_fit
budget
priority
reason
```

---

# 52. Compra

Estados:

```text
RECOMMENDED
SHORTLISTED
PURCHASED
DISCARDED
```

Comprar no deberá añadir automáticamente la prenda al inventario.

---

# 53. Evaluación de una compra

En fases futuras el usuario podrá proporcionar:

- fotografía;
- URL;
- descripción.

Y preguntar:

> “¿Me conviene comprar esto?”

La respuesta deberá considerar:

```text
compatibilidad
redundancia
necesidad
precio
guardarropa actual
cantidad de outfits potenciales
```

---

# 54. Travel Wardrobe

Futuro módulo encargado de generar cápsulas para viajes.

Entrada:

```text
destinos
fechas
clima
actividades
lavandería
equipaje
peso máximo
```

Salida:

```text
prendas recomendadas
outfits diarios
combinaciones
peso estimado
```

---

# 55. Alexa Integration

Closet AI deberá contar con una integración mediante Alexa Custom Skill.

Flujo conceptual:

```text
Alexa
↓
Closet AI Skill
↓
Authentication
↓
User identification
↓
Closet API
↓
Recommendation Engine
```

---

# 56. Comandos conversacionales

Ejemplos:

> Alexa, dile a mi stylist qué me pongo hoy.

> Alexa, dile a mi stylist que voy al gimnasio.

> Alexa, pregúntale a mi stylist qué me pongo para una cena.

> Alexa, dile a mi stylist que mañana voy a lavar ropa.

> Alexa, dile a mi stylist que ya lavé los oscuros.

---

# 57. Identificación del usuario

Siempre que la plataforma Alexa permita reconocer al hablante, deberá mapearse a:

```text
VOICE_PROFILE
↓
PERSON_ID
↓
CLOSET_USER
```

Cuando no sea posible reconocerlo:

> “¿Para quién quieres generar el outfit?”

---

# 58. Echo Show

En dispositivos con pantalla podrán mostrarse:

```text
LOOK A
LOOK B
LOOK C
```

Cada uno con:

- imagen;
- puntuación;
- explicación breve.

---

# 59. Telegram

Telegram funcionará como canal secundario.

Casos:

- recibir outfit;
- recibir imágenes;
- seleccionar opción;
- confirmar uso;
- consultar lavado;
- recibir recordatorios.

---

# 60. Ejemplo de mensaje

```text
OUTFIT PARA LA CENA

Temperatura: 21 °C
Lluvia: 30%

Playera crema
Pantalón negro
Sobrecamisa oliva
Vans gris
```

Acciones:

```text
[ LO USÉ ]
[ NO LO USÉ ]
[ CAMBIÉ UNA PRENDA ]
```

---

# 61. Arquitectura propuesta

Para las primeras versiones se utilizará un:

> **Modular Monolith**

No se utilizarán microservicios inicialmente salvo necesidad técnica demostrada.

---

# 62. Arquitectura lógica

```text
                    CLIENTS
   ┌───────────────────────────────────┐
   │ Web / PWA                         │
   │ Tablet                            │
   │ Alexa                             │
   │ Echo Show                         │
   │ Telegram                          │
   └──────────────────┬────────────────┘
                      │
               API / BFF Layer
                      │
        ┌─────────────▼─────────────┐
        │       CLOSET AI CORE      │
        │                           │
        │ Identity                  │
        │ Household                 │
        │ Style Profile             │
        │ Wardrobe                  │
        │ Outfit                    │
        │ Recommendation            │
        │ Laundry                   │
        │ Garment Lifecycle         │
        │ Shopping                  │
        │ Notification              │
        │ Analytics                 │
        └─────────────┬─────────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
       ▼              ▼              ▼
   Database         AI Layer      Integrations
                       │
             ┌─────────┼──────────┐
             ▼         ▼          ▼
             LLM     Vision    Image Gen
```

---

# 63. Bounded Contexts

Inicialmente se consideran:

1. Identity
2. Household
3. Style Profile
4. Wardrobe
5. Outfit
6. Recommendation
7. Context
8. Laundry
9. Garment Lifecycle
10. Shopping
11. Artificial Intelligence
12. Notification
13. Analytics
14. Integrations

---

# 64. Entidades principales

```text
HOUSEHOLD
USER
AUTH_IDENTITY

BODY_PROFILE
STYLE_PROFILE
COLOR_PROFILE
USER_PREFERENCE

GARMENT
GARMENT_IMAGE
GARMENT_ATTRIBUTE
GARMENT_USAGE
GARMENT_WASH
GARMENT_CONDITION

OUTFIT
OUTFIT_ITEM
OUTFIT_RECOMMENDATION
OUTFIT_USAGE
OUTFIT_FEEDBACK

ACTIVITY
WEATHER_CONTEXT

LAUNDRY_BATCH

SHOPPING_ITEM
PURCHASE

AI_INTERACTION
NOTIFICATION
```

---

# 65. Inteligencia artificial

Closet AI no deberá utilizar un único prompt universal.

Deberán existir capacidades especializadas.

---

# 66. Style Profiler

Responsable de:

- analizar cuestionarios;
- generar perfil estilístico;
- identificar preferencias;
- actualizar perfil.

---

# 67. Wardrobe Architect

Responsable de:

- proponer guardarropa;
- detectar huecos;
- identificar redundancias;
- recomendar cantidades.

---

# 68. Garment Analyzer

Responsable de analizar fotografías.

Salida estructurada:

```json
{
  "category": "T_SHIRT",
  "primaryColor": "CREAM",
  "pattern": "SOLID",
  "fit": "OVERSIZED",
  "formality": 2
}
```

---

# 69. Outfit Stylist

Responsable de:

- seleccionar combinaciones;
- evaluar compatibilidad;
- explicar recomendaciones.

Siempre trabajará únicamente con prendas proporcionadas por el backend.

---

# 70. Laundry Advisor

Responsable de:

- recomendar lavado;
- sugerir lotes;
- detectar prendas reutilizables.

---

# 71. Shopping Advisor

Responsable de:

- identificar compras útiles;
- detectar redundancia;
- evaluar compatibilidad.

---

# 72. Visual Outfit Generator

Responsable de crear representaciones visuales.

---

# 73. AI Orchestrator

Determinará qué capacidad debe ejecutarse.

Ejemplo:

```text
“¿Qué me pongo para cenar?”

↓
Intent detection

OUTFIT_REQUEST

↓
Context Engine
↓
Recommendation Engine
↓
Outfit Stylist
↓
Visualization
```

---

# 74. RAG / Retrieval

Antes de ejecutar un LLM deberán recuperarse exclusivamente los datos necesarios.

Ejemplo:

```text
User profile
+
available garments
+
weather
+
activity
+
preferences
```

El LLM no deberá recibir toda la base de datos.

---

# 75. Structured Output

Toda respuesta de IA utilizada por backend deberá intentar utilizar formatos estructurados.

Ejemplo:

```json
{
  "outfit": [
    "GARMENT-001",
    "GARMENT-018",
    "GARMENT-047"
  ],
  "score": 92,
  "reason": "..."
}
```

---

# 76. Seguridad de IA

El backend deberá validar:

- identificadores;
- propietario;
- disponibilidad;
- estado;
- compatibilidad básica.

Nunca confiar ciegamente en el output del LLM.

---

# 77. Persistencia

Se recomienda inicialmente una base de datos relacional.

Primera alternativa:

```text
PostgreSQL
```

Motivos:

- modelo altamente relacional;
- transacciones;
- extensibilidad;
- JSONB;
- soporte geográfico si posteriormente es requerido;
- buena integración con diferentes frameworks.

---

# 78. Almacenamiento de imágenes

Las fotografías deberán almacenarse fuera de la base relacional.

Opciones:

```text
S3 compatible object storage
Cloudflare R2
AWS S3
MinIO
```

La base guardará las referencias.

---

# 79. Cache

Inicialmente opcional.

Cuando sea necesaria:

```text
Redis
```

Casos:

- sesiones;
- recomendaciones temporales;
- contexto;
- consultas frecuentes.

---

# 80. Backend

La implementación deberá permitir escoger stack.

Alternativas recomendadas:

### Alternativa A

```text
Java 21+
Spring Boot
PostgreSQL
```

### Alternativa B

```text
TypeScript
NestJS
PostgreSQL
```

Para un sistema personal con futura expansión ambas son válidas.

---

# 81. Frontend

Recomendación:

```text
React
Next.js
TypeScript
```

Implementado como PWA responsive.

---

# 82. Interfaz

Debe diseñarse principalmente para:

```text
Desktop
Tablet
Mobile
```

La tablet será un caso de uso prioritario.

---

# 83. Autenticación

Debe existir autenticación desde MVP.

Opciones:

- email/password;
- magic link;
- OAuth.

Se recomienda utilizar un proveedor especializado si simplifica el proyecto.

---

# 84. Autorización

Todo recurso deberá validarse contra:

```text
authenticated_user
```

y:

```text
household
```

Un usuario no podrá leer o modificar prendas de otro usuario salvo permisos explícitos.

---

# 85. APIs conceptuales

Ejemplo inicial:

```text
POST   /users
GET    /users/{id}

POST   /style-profile
GET    /style-profile/{userId}

POST   /garments
GET    /garments
GET    /garments/{id}
PATCH  /garments/{id}
DELETE /garments/{id}

POST   /garments/{id}/wear
POST   /garments/{id}/wash

POST   /outfits/recommend
POST   /outfits/{id}/select
POST   /outfits/{id}/wear
POST   /outfits/{id}/feedback

POST   /laundry/recommend
POST   /laundry/batches

GET    /shopping/recommendations
```

---

# 86. Observabilidad

Desde primeras versiones deberá existir:

- logging estructurado;
- correlation ID;
- métricas básicas;
- manejo centralizado de errores.

En fases posteriores:

- OpenTelemetry;
- dashboards;
- tracing.

---

# 87. Testing

Deberán existir como mínimo:

```text
Unit Tests
Integration Tests
API Tests
```

Los módulos que determinen disponibilidad de prendas deberán tener cobertura prioritaria.

---

# 88. Estrategia de desarrollo

El proyecto deberá implementarse de forma incremental.

Cada fase deberá producir software utilizable.

---

# 89. Fase 0 — Foundation

Objetivo:

Crear los cimientos.

Incluye:

- repositorio;
- estructura;
- CI;
- backend;
- frontend;
- DB;
- autenticación;
- logging;
- configuración.

---

# 90. Fase 1 — Digital Closet MVP

Incluye:

- Household;
- usuarios;
- perfiles;
- prendas;
- categorías;
- imágenes;
- estados;
- CRUD;
- interfaz web/tablet.

Resultado:

> Guardarropa digital funcional sin IA avanzada.

---

# 91. Fase 2 — Style Discovery

Incluye:

- cuestionario;
- preferencias;
- estilos;
- colorimetría;
- recomendaciones iniciales;
- guardarropa objetivo.

---

# 92. Fase 3 — AI Garment Analysis

Incluye:

- fotografía;
- visión artificial;
- clasificación;
- confirmación manual.

---

# 93. Fase 4 — AI Stylist

Incluye:

- clima;
- contexto;
- actividades;
- generación de outfits;
- scoring;
- selección;
- feedback.

---

# 94. Fase 5 — Outfit Visualization

Incluye:

- flat lay;
- maniquí;
- imágenes;
- histórico visual.

---

# 95. Fase 6 — Telegram

Incluye:

- bot;
- mensajes;
- imágenes;
- botones;
- confirmación de uso.

---

# 96. Fase 7 — Alexa

Incluye:

- Custom Skill;
- Account Linking;
- reconocimiento de intención;
- identificación de usuario;
- interacción conversacional.

---

# 97. Fase 8 — Laundry Intelligence

Incluye:

- wear count;
- wash count;
- laundry score;
- batches;
- estados;
- calendario.

---

# 98. Fase 9 — Garment Lifecycle

Incluye:

- condition score;
- reparación;
- retiro;
- donación;
- coste por uso.

---

# 99. Fase 10 — Shopping Intelligence

Incluye:

- huecos;
- redundancia;
- wishlist;
- recomendaciones;
- evaluación de compras.

---

# 100. Fase 11 — Travel Wardrobe

Incluye:

- destinos;
- clima;
- actividades;
- peso;
- outfits;
- packing list.

---

# 101. Fase 12 — Adaptive Intelligence

Incluye aprendizaje de:

- selecciones;
- rechazos;
- colores;
- combinaciones;
- frecuencia;
- comodidad.

---

# 102. Épicos del proyecto

```text
EPIC-001 Project Foundation
EPIC-002 Identity & Authentication
EPIC-003 Household Management
EPIC-004 Style Discovery
EPIC-005 Wardrobe Builder
EPIC-006 Digital Closet
EPIC-007 Garment Recognition
EPIC-008 Context Engine
EPIC-009 Weather Integration
EPIC-010 Outfit Recommendation
EPIC-011 AI Stylist
EPIC-012 Outfit Visualization
EPIC-013 Outfit Feedback
EPIC-014 Telegram Integration
EPIC-015 Alexa Integration
EPIC-016 Laundry Intelligence
EPIC-017 Garment Lifecycle
EPIC-018 Shopping Intelligence
EPIC-019 Travel Wardrobe
EPIC-020 Adaptive Learning
EPIC-021 Analytics
EPIC-022 Observability
EPIC-023 Security
```

---

# 103. Historia de usuario principal

```text
COMO usuario de Closet AI

QUIERO solicitar un outfit indicando qué voy a hacer

PARA recibir una combinación personalizada utilizando únicamente ropa disponible de mi guardarropa.
```

---

# 104. Criterios de aceptación principales

```text
DADO que el usuario tiene prendas registradas

Y existen prendas en diferentes estados

Y se conoce el contexto solicitado

CUANDO solicita un outfit

ENTONCES el sistema debe considerar únicamente prendas elegibles

Y debe considerar actividad y clima

Y debe generar al menos una recomendación válida

Y debe devolver los identificadores de las prendas seleccionadas

Y debe explicar brevemente la recomendación.
```

---

# 105. Caso de uso principal

Entrada:

> “Hoy estaré trabajando en casa. A las cinco iré al gimnasio y a las ocho tengo una cena informal.”

Proceso:

```text
Speech/Text
↓
Intent Parser
↓
User Identification
↓
Context Builder
↓
Weather
↓
Available Garments
↓
Rule Engine
↓
AI Stylist
↓
Ranking
↓
Visualization
↓
Response
```

---

# 106. Resultado esperado

```text
LOOK 1 — HOME OFFICE

TOP-005
BOTTOM-008
FOOTWEAR-003

LOOK 2 — GYM

SPORT-TOP-002
SPORT-BOTTOM-004
SPORT-SHOES-001

LOOK 3 — DINNER

TOP-011
BOTTOM-008
OVERSHIRT-003
FOOTWEAR-003
```

El sistema podrá detectar que algunas prendas pueden reutilizarse.

---

# 107. Flujo post-utilización

```text
OUTFIT GENERATED
↓
OUTFIT SELECTED
↓
OUTFIT WORN
↓
GARMENT USAGE CREATED
↓
WEAR COUNTS UPDATED
↓
LAUNDRY SCORE RECALCULATED
↓
USER PREFERENCES UPDATED
```

---

# 108. Eventos de dominio recomendados

Ejemplos:

```text
UserCreated
StyleProfileCompleted
GarmentAdded
GarmentWorn
GarmentMovedToLaundry
GarmentWashed
OutfitGenerated
OutfitSelected
OutfitWorn
OutfitRejected
GarmentConditionUpdated
GarmentRetired
PurchaseRegistered
```

---

# 109. Requerimientos funcionales MVP

## RF-001

El sistema deberá soportar mínimo dos usuarios.

## RF-002

Cada prenda deberá pertenecer a un usuario.

## RF-003

El usuario podrá registrar prendas.

## RF-004

El usuario podrá modificar prendas.

## RF-005

El usuario podrá eliminar o retirar prendas.

## RF-006

Cada prenda deberá tener estado.

## RF-007

El sistema deberá consultar prendas disponibles.

## RF-008

El sistema deberá generar outfits.

## RF-009

El sistema deberá registrar selección.

## RF-010

El sistema deberá registrar uso.

## RF-011

El sistema deberá registrar feedback.

---

# 110. Requerimientos no funcionales

## RNF-001 — Seguridad

Todas las APIs privadas deberán requerir autenticación.

## RNF-002 — Privacidad

Las fotografías no deberán ser públicas.

## RNF-003 — Persistencia

Los cambios importantes deberán persistir.

## RNF-004 — Auditabilidad

Eventos importantes deberán registrar fecha y usuario.

## RNF-005 — Resiliencia

La indisponibilidad de un proveedor de IA no deberá provocar pérdida de información.

## RNF-006 — Extensibilidad

Deberá ser posible sustituir proveedores de IA.

## RNF-007 — Portabilidad

El core de negocio no deberá depender directamente de Alexa o Telegram.

---

# 111. Abstracción de proveedores de IA

Crear interfaces como:

```text
LanguageModelProvider
VisionProvider
ImageGenerationProvider
EmbeddingProvider
```

De esta forma:

```text
OpenAI
Google
Anthropic
Amazon
Local model
```

podrán intercambiarse.

---

# 112. Abstracción de clima

```text
WeatherProvider
```

evitando dependencia directa del proveedor.

---

# 113. Abstracción de mensajería

```text
NotificationProvider
```

Implementaciones:

```text
Telegram
Push
Email
Alexa
```

---

# 114. Reglas de negocio críticas

1. Una prenda sucia nunca podrá aparecer como disponible.

2. Una prenda de otro usuario no podrá recomendarse.

3. Una recomendación no implica uso.

4. Un uso únicamente se registra después de confirmación.

5. Una prenda no se marca como lavada sin confirmación.

6. Una prenda nunca se desecha automáticamente.

7. El modelo generativo no modifica directamente la base.

8. Toda respuesta estructurada de IA deberá validarse.

9. Todo identificador producido por IA deberá existir.

10. Toda prenda seleccionada deberá continuar disponible antes de confirmar el outfit.

---

# 115. Out of Scope v1

No formará parte del MVP inicial:

- comercio electrónico propio;
- pagos;
- marketplace;
- comunidad;
- perfiles públicos;
- compartir outfits;
- realidad aumentada;
- probador virtual hiperrealista;
- reconocimiento mediante cámaras permanentes;
- compra automática;
- control automático de lavadoras;
- integración con fabricantes de ropa.

---

# 116. Métricas de éxito

Las principales métricas futuras serán:

```text
Outfit Acceptance Rate
Outfit Usage Rate
Garment Utilization Rate
Unused Garment Ratio
Average Cost per Wear
Recommendation Satisfaction
Recommendation Rejection Rate
Wardrobe Coverage
Laundry Prediction Accuracy
Shopping Recommendation Acceptance
```

---

# 117. Métrica principal

Se propone inicialmente:

> **Outfit Acceptance Rate**

```text
Outfits utilizados
÷
Outfits seleccionados/recomendados
```

---

# 118. Second North Star Metric

> **Wardrobe Utilization Rate**

Determinar qué porcentaje del guardarropa se utiliza de forma regular.

---

# 119. Riesgos técnicos

## Riesgo 1

Alucinaciones del LLM.

Mitigación:

- IDs;
- structured outputs;
- validación backend.

## Riesgo 2

Clasificación incorrecta de fotografías.

Mitigación:

- confirmación manual.

## Riesgo 3

Sistema excesivamente complejo.

Mitigación:

- modular monolith;
- desarrollo incremental.

## Riesgo 4

Dependencia de IA.

Mitigación:

- abstracción de proveedores.

## Riesgo 5

Costos de imágenes.

Mitigación:

- cache;
- generar únicamente cuando sea necesario.

---

# 120. Riesgos de producto

El usuario puede dejar de registrar:

- ropa utilizada;
- ropa lavada;
- cambios de estado.

Esto degradaría las recomendaciones.

Por lo tanto, actualizar el guardarropa debe requerir la menor fricción posible.

---

# 121. Principio UX

Cada acción frecuente deberá poder completarse en aproximadamente:

```text
1–3 interacciones
```

Ejemplo:

> ¿Usaste este outfit?

```text
Sí
No
Parcialmente
```

---

# 122. Diseño conversacional

El asistente deberá evitar respuestas excesivamente largas en voz.

Alexa deberá responder:

> “Te recomiendo el outfit uno. Es cómodo para 21 grados y adecuado para una cena informal. Te envié las opciones completas a Telegram.”

La explicación completa puede mostrarse visualmente.

---

# 123. Roadmap conceptual

```text
FOUNDATION
   ↓
DIGITAL CLOSET
   ↓
STYLE PROFILE
   ↓
GARMENT AI
   ↓
OUTFIT ENGINE
   ↓
VISUALIZATION
   ↓
TELEGRAM
   ↓
ALEXA
   ↓
LAUNDRY
   ↓
LIFECYCLE
   ↓
SHOPPING
   ↓
TRAVEL
   ↓
ADAPTIVE INTELLIGENCE
```

---

# 124. Definición de terminado

Una funcionalidad se considerará terminada cuando:

- código implementado;
- compilación correcta;
- pruebas exitosas;
- reglas de negocio cubiertas;
- manejo de errores;
- logs;
- documentación mínima;
- endpoint documentado;
- frontend funcional cuando aplique;
- sin vulnerabilidades críticas conocidas.

---

# 125. Reglas para una IA desarrolladora

La inteligencia artificial que ayude a desarrollar Closet AI deberá obedecer los siguientes principios.

## Regla 1

No generar todo el sistema simultáneamente.

## Regla 2

Trabajar por épicos e historias.

## Regla 3

Antes de implementar, definir:

```text
objetivo
dependencias
modelo
API
reglas
pruebas
```

## Regla 4

No introducir microservicios sin justificación.

## Regla 5

Mantener arquitectura modular.

## Regla 6

No acoplar dominio a proveedores externos.

## Regla 7

La lógica crítica no deberá depender exclusivamente de prompts.

## Regla 8

Nunca permitir que un LLM escriba directamente en base de datos.

## Regla 9

Validar todo output generado por IA.

## Regla 10

Toda modificación de arquitectura deberá justificarse.

---

# 126. Estructura sugerida del repositorio

Ejemplo conceptual:

```text
closet-ai/
│
├── apps/
│   ├── backend/
│   └── web/
│
├── packages/
│   ├── domain/
│   ├── shared/
│   └── ui/
│
├── infrastructure/
│   ├── docker/
│   └── deployment/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── domain/
│   └── adr/
│
└── README.md
```

La estructura final dependerá del stack.

---

# 127. Architecture Decision Records

Las decisiones importantes deberán documentarse mediante ADR.

Ejemplos:

```text
ADR-001 Modular Monolith
ADR-002 PostgreSQL
ADR-003 AI Provider Abstraction
ADR-004 Image Storage Strategy
ADR-005 Authentication Strategy
ADR-006 Alexa Integration
```

---

# 128. Documentación técnica mínima

El repositorio deberá mantener:

```text
README
Architecture Overview
Domain Model
API Documentation
Database Schema
Local Development Guide
Environment Variables
Deployment Guide
ADR
AI Prompt Documentation
```

---

# 129. Gestión de prompts

Los prompts no deberán escribirse directamente dentro de controllers.

Deberán almacenarse y versionarse.

Ejemplo:

```text
prompts/
├── style-profiler/
│   └── v1.md
├── garment-analyzer/
│   └── v1.md
├── outfit-stylist/
│   └── v1.md
└── laundry-advisor/
    └── v1.md
```

---

# 130. Prompt versioning

Cada interacción podrá registrar:

```text
prompt_name
prompt_version
model
temperature
input_tokens
output_tokens
latency
result
```

Esto permitirá evaluar calidad y costos.

---

# 131. Feature Flags

Funciones experimentales deberán poder habilitarse mediante feature flags.

Ejemplos:

```text
AI_OUTFIT_GENERATION
IMAGE_GENERATION
TELEGRAM
ALEXA
LAUNDRY_AI
SHOPPING_AI
```

---

# 132. Estrategia inicial de despliegue

La primera versión podrá ejecutarse en:

- Docker local;
- servidor doméstico;
- VPS;
- nube.

El proyecto deberá utilizar contenedores desde sus primeras fases.

---

# 133. Entornos

Se recomiendan:

```text
LOCAL
DEV
PROD
```

Al tratarse inicialmente de un proyecto personal, no es obligatorio mantener ambientes corporativos adicionales.

---

# 134. CI/CD

Como mínimo:

```text
checkout
install
compile
unit tests
integration tests
build image
security scan
```

Posteriormente:

```text
deploy DEV
deploy PROD
```

---

# 135. Backups

Se deberá implementar respaldo periódico de:

```text
database
garment metadata
user preferences
```

Las fotografías podrán respaldarse mediante las políticas del object storage seleccionado.

---

# 136. Evolución futura

Closet AI deberá diseñarse considerando posibles extensiones:

- Apple Shortcuts;
- Siri;
- Google Assistant si vuelve a existir una superficie compatible;
- Apple Watch;
- smart mirror;
- Home Assistant;
- NFC en prendas;
- etiquetas QR;
- sensores;
- lavadoras inteligentes;
- e-commerce;
- recomendación de productos online.

Ninguna deberá condicionar el MVP.

---

# 137. Principio de evolución

Cada integración externa deberá adaptarse al dominio de Closet AI.

El dominio nunca deberá adaptarse exclusivamente a un proveedor.

Arquitectura:

```text
External System
      ↓
Adapter
      ↓
Application
      ↓
Domain
```

---

# 138. Ciclo de inteligencia del producto

El corazón de Closet AI será:

```text
PROFILE
   ↓
WARDROBE
   ↓
CONTEXT
   ↓
RECOMMENDATION
   ↓
SELECTION
   ↓
USAGE
   ↓
FEEDBACK
   ↓
LAUNDRY
   ↓
CONDITION
   ↓
SHOPPING
   ↓
WARDROBE
   ↺
```

Cada iteración deberá aumentar la calidad de las recomendaciones.

---

# 139. Resultado esperado a largo plazo

Después de varios meses de utilización, Closet AI deberá ser capaz de conocer:

- qué usa cada persona;
- qué evita;
- qué colores prefiere;
- qué combinaciones acepta;
- qué prendas utiliza constantemente;
- cuáles casi nunca utiliza;
- qué clima tolera;
- qué considera cómodo;
- qué considera formal;
- qué prendas necesitan mantenimiento;
- qué compras producen mayor valor.

El sistema pasará de:

> “Estas prendas combinan.”

a:

> “Basándome en tu historial, probablemente prefieras esta combinación, tienes todas las prendas disponibles y ninguna requiere lavado después de hoy.”

---

# 140. Criterio de éxito de la versión 1 del producto

La primera versión funcional completa deberá permitir que un usuario pueda:

1. crear su perfil;
2. completar su cuestionario;
3. registrar prendas;
4. ver su guardarropa;
5. marcar estados;
6. solicitar un outfit;
7. obtener una recomendación con prendas existentes;
8. seleccionar el outfit;
9. confirmar que lo utilizó;
10. actualizar automáticamente los contadores asociados.

Cuando este flujo funcione correctamente de extremo a extremo, se considerará que existe un **MVP funcional de Closet AI**.

---

# 141. Instrucción maestra para futuras sesiones de desarrollo

Cuando una inteligencia artificial reciba este documento deberá considerar que actúa como:

> **Arquitecto de software, Product Owner técnico, desarrollador senior y especialista en sistemas con inteligencia artificial para Closet AI.**

Su responsabilidad será transformar progresivamente esta definición en software funcional.

Deberá:

1. respetar este documento como fuente de requisitos;
2. identificar inconsistencias antes de implementar;
3. proponer decisiones técnicas justificadas;
4. trabajar incrementalmente;
5. producir código mantenible;
6. crear pruebas;
7. mantener documentación;
8. no modificar reglas críticas sin aprobación;
9. separar dominio, infraestructura e IA;
10. priorizar simplicidad y evolución.

Ante cualquier conflicto entre una recomendación tecnológica y las reglas de negocio descritas en este documento, deberán prevalecer las reglas de negocio.

---

# 142. Próximo entregable recomendado

A partir de este documento deberán generarse, en este orden:

```text
01 — Product Requirements Document (PRD)
02 — Architecture Design Document
03 — Domain Model v1
04 — Database Model v1
05 — API Contract v1
06 — UX / User Flows
07 — AI Architecture
08 — Prompt Architecture
09 — Security Model
10 — Epics
11 — Features
12 — User Stories
13 — Acceptance Criteria
14 — Technical Tasks
15 — MVP Backlog
16 — Development Roadmap
17 — Repository Bootstrap
```

---

# 143. Primera instrucción recomendada para la IA desarrolladora

Una vez proporcionado este documento a una IA de desarrollo, la primera instrucción deberá ser:

> Analiza completamente el Documento de Definición del Proyecto Closet AI v1.0. No escribas todavía código de producción. Identifica primero el dominio, actores, bounded contexts, entidades, agregados, reglas de negocio, estados, casos de uso y dependencias. Después propón una arquitectura inicial para un modular monolith, identifica las decisiones técnicas que todavía deben tomarse y genera el backlog del MVP organizado por épicos, features, historias de usuario y tareas técnicas. Mantén las reglas del documento como restricciones obligatorias y señala cualquier contradicción o requisito que requiera decisión antes de comenzar la implementación.

---

# 144. Conclusión

Closet AI no deberá construirse como una simple aplicación de moda ni como una interfaz encima de un modelo generativo.

Su diseño se basa en tres componentes principales:

```text
DOMAIN
+
DATA
+
ARTIFICIAL INTELLIGENCE
```

El dominio administra el guardarropa.

Los datos representan la realidad.

La inteligencia artificial interpreta, recomienda y aprende.

Esta separación permitirá construir una solución mantenible, explicable y progresivamente más inteligente sin perder confiabilidad sobre la información real de los usuarios.

---

**Fin del Documento de Definición del Proyecto Closet AI v1.0**