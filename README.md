# fast
Простой шаблонизатор для быстрого прототипирования. То, что нужно, если нужно быстро наверстать прототип и влом подключать разные зависимости и настраивать сборщики, но хочется в компоненты и внятной структуры проекта. 
[Пример использования](https://everydayhero2000.github.io/fast/index.html)

+ Шаблоны компонентов как в vue.js. html/js/css в одном файле компонента.
+ Никакого jsx.
+ sass для css
+ Методы и события для компонентов.
+ Минимум настроек, не нужно ничего никуда импортить.
+ 0 зависимостей

## Быстрый старт
Понадобится любимый браузер и редактор для кода (например vscode с плагином для live preview). GitHub pages что-бы поделиться ссылкой на прототип.

В `index.html` Подклюение fast.js в конце body и инициируем его `__fast__.init({options},[HTMLElement])`.

##### index.html
```
... 
<body>
    <div class="wrapper">
        <card:>
            <div class="title">Заголовок карточки</div>
            <button: text="Кнопка"></button:>
        </card:>
    </div>

    <script src="fast/fast.min.js"></script>
    <script>
        __fast__.init();
    </script>
</body>
```

В примере мы пытаемся использовать два компонента Card `<card:>` и Button `<button:>`.

В директории `src/components/` нужно создать две поддиректории `/Button` и `/Card` с файлами `/Button.html` и `/Card.html`.

##### src/components/Button/Button.html
```
<template>
    <button class="button" onclick="${message}" >${text}</button>
<template>

<script>
    ({
        props: {
            text: {}
        },
        mounted: function(elem) {
            console.log('Кнопка создана!', elem)
        },
        methods: {
            message: function(event){
                console.log('Клик!', event)
            }
        }
    })
</script>

<style>
    .button {
        background: red,
        border-radius: 8px;
        color: #fff;
        font-family: sans-serif;
    }
</style>
```

##### src/components/Card/Card.html

```
<template>
    <div class="card">
        <div class="card__inner">
            <slot name="header"></slot>
            <slot name="footer"></slot>
        </div>    
    </div>
<template>

<script>
    ({})
</script>

<style>
    .card {
        background: #fff,
        border-radius: 16px;
        padding: 16px;
        box-sizing: border-box;
        box-shadow: 0 5px 10px rgba(0,0,0,0.3);
    }
</style>
```

Этот простой пример отрендерится в:

```
<div class="wrapper">
    <div class="card">
        <div class="card__inner">
            <div class="title">Заголовок карточки</div>
            <button class="button">Кнопка</button>
        </div>
    </div>    
</div>
```
Стили всех компонентов соберутся в одном месте и будут созданы обработчики событий. 

## Особенности

### TEMPLATE
1. В названии html тега должен быть символ-маркер, по умолчанию это `:`. Символ можжно переопределить в конфиге `__fast__.config.tagSign`. Спецсимвол нужен для того что-бы парсер смог определить кастомный компонент даже в том случае если вы попытаетесь использовать стандартный html тэг.
2. Директории и файлы компонентов следует называть с заглавной буквы (Button, Icon, Navigation).
3. По умолчанию расширение файла компонента html, но можно использовать любое расширение, например tpl. Переопределить расширение файла компонента можно в конфиге `__fast__.config.componentsExtension`.
4. Директория с компонентами по умолчанию `src/components/`, настроить можно в `__fast__.config.componentsDirectory`. 
5. Для сложносочиненых названий тегов следует использовать `kebab-case`.

##### Примеры:

|Тег                |Директория компонента               |                               |
| ------------------|------------------------------------|-------------------------------|
| `<Button:>`       | Button/Button.html                 |                               |
| `<button:>`       | Button/Button.html                 | теги можно с маленькой буквы. |
| `<Icon:>`         | Icon/Icon.html                     |                               |
| `<Company-logo:>` | Company-logo/Company-logo.html     |                               |
| `<Navigation:>`   | Navigation/Navigation.html         |                               |
| `<My-component:>` | My-component/My-component.html     |                               |

6. Шаблон компонента обрабатывается как многострочный литерал (шаблонная строка). В момент сборки компонента в шаблоне используются переменные из `props` и `methods`. Можно вкладывать шаблоны в шаблоны, например для реализации цикла. 

##### Примеры:

Заполнение шаблона переменной

|Шаблон               |Результат          |
|---------------------|-------------------|
|`<div>${name}</div>` | `<div>Илья</div>` |


Цикл

|Шаблон               |Результат          |
|---------------------|-------------------|
|```<ul>${[...Array(5)].map((e,i)=>{return `<li>Элемент: ${i}</li>` }).join('')}</ul>``` | ```<ul><li>Элемент: 0</li><li>Элемент: 1</li><li>Элемент: 2</li><li>Элемент: 3</li><li>Элемент: 4</li></ul>```|


### SCRIPT
1. Основные ключи свойств объекта компонента: `props` - переменные для отрисовки компонента в момент рендеринга. `methods` — функции-методы компонента. `created`, `mounted` — функции-хуки при отрисовке компонента.
2. Шаблон компонента обрабатывается как многострочный литерал (шаблонная строка). В момент сборки компонента в шаблоне используются переменные из `props` и `methods`. Можно вкладывать шаблоны в шаблоны, например для реализации цикла. 
3. Обработчики событий как html атрибуты. В качестве значения атрибута указывается метод объявленый в компоненте.

|TEMPLATE |SCRIPT | |
|--|--|--|
|`<div onclick="click">Кнопка</div>`|```({methods: {click: (e)=> console.log('Клик!', e)}})``` |Консоль выведет `Клик!` и объект события.| 

### STYLE
1. Стили можно писать на scss, но нужно подключить sass.sync.js
2. Картинки, иконк и прочии ресурсы компонента нужно складывать в поддиректорию в директории компонента `/assets`. Для обращение к рессурсу можно использовать ключевое слово `@component` например `background-image: url(@component/image.svg)`.
3. Именование класов по БЭМ методологии.