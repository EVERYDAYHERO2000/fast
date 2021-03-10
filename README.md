# fast
Простой шаблонизатор для быстрого прототипирования. То, что нужно, если нужно быстро наверстать прототип и влом подключать разные зависимости и настраивать сборщики, но хочется в компоненты и внятной структуры проекта. 

+ Шаблоны компонентов как в vue.js. html/js/css в одном файле компонента.
+ Никакого jsx.
+ Методы и события для компонентов.
+ Минимум настроек, не нужно ничего никуда импортить.
+ 0 зависимостей

## Быстрый старт
Понадобится любимый браузер и редактор для кода (например vscode с плагином для live preview). GitHub pages что-бы поделиться ссылкой на прототип.

В `index.html` Подклюение fast.js в конце body и инициируем его`__fast__.init({options},[NodeList])`.

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

    <script src="https://raw.githubusercontent.com/EVERYDAYHERO2000/fast/main/dist/fast.min.js"></script>
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
    <button class="button" on:click="message" >${text}</button>
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