(function(){

    const __fast__ = window.__fast__ = {
        components: {},
        config: {
            tagSign: ':',
            componentsDirectory: 'src/components',
            components: [],
            css: ''
        },
        findComponents: findComponents,
        init: init,
        installComponent: installComponent
    }

    /**
     * Инициализация `__fast__`.
     * @param {Object} config - конфиг
     * @param {NodeList} entryElems - набор узлов документа 
     */
    function init(config, entryElems) {
        __fast__.config = {...__fast__.config, ...config};
        addStyles(__fast__.config.css);
        return (entryElems) ? findComponents(entryElems) : false;
    }

    /**
     * Проверить все элементы в коллекции.
     * 
     * @param {NodeList} elems - набор узлов для проверки
     */
    function findComponents(elems){
        for (const elem of elems) {

            const tagName = elem.tagName;

            // если `:` то компонент
            if (tagName && tagName.includes(__fast__.config.tagSign)) {

                const componentName = tagName[0] + tagName.toLowerCase().slice(1, tagName.length - 1);

                //если не загружен
                if (!__fast__.components[componentName]) {

                    __fast__.components[componentName] = {};

                    loadComponent(componentName, function(context){
                        installComponent(context, componentName);

                        findComponents(elems);
                        
                    });

                } else {
                
                    //компонент найден в __fast__
                    if (__fast__.components[componentName].template) {
                        if (elem.parentElement) renderComponent(elem, componentName);
                    }

                }

            }        

        }
        return elems;
    }

    //отрендерить компонент
    function renderComponent(elem, componentName) {
        const entryChilds = elem.childNodes;
        const entrySlots = elem.querySelectorAll('slot');
        const entryAttributes = (() => {
            const result = {};
            for (let a of elem.attributes){
                result[a.nodeName] = a.nodeValue;
            }
            return result;
        })();

        const component = __fast__.components[componentName];
        const props = JSON.parse(JSON.stringify(component.props));
        const simpleAttributes = {};

        //заполнить свойства экземпляра
        for (let attr in entryAttributes) {
            let match = false;
            for (let prop in props) {
                
                if (prop == attr) {
                    match = true;
                    props[prop].value = entryAttributes[attr];
                    
                } 
            }
            if (!match) simpleAttributes[attr] = entryAttributes[attr];
        }

        const newElem = (function(props){
            const parser = new DOMParser();
            
            const template = parser.parseFromString(component.template(props), "text/html").body;
            const elems = template.querySelectorAll('*');

            for (let e of elems) {
                for (let a of e.attributes) {
                    if (a.name.includes(':')) {
                        const eventProp = {
                            name: a.name.replace(':',''),
                            value: `__${a.nodeValue}`
                        }

                        e[eventProp.value] = component.methods[a.nodeValue];
                        e.removeAttribute(a.name);
                        e.addEventListener(eventProp.name.slice(2), component.methods[a.nodeValue]);
                    }
                }
            }

            return template.children[0];

        })(props); 

        findComponents(newElem.querySelectorAll('*'));

        //установить простые атрибуты для узла
        for (let attr in simpleAttributes) {
            if (newElem.hasAttribute(attr)){
                newElem.setAttribute(
                    attr, 
                    `${newElem.getAttribute(attr)} ${simpleAttributes[attr]}`
                );
            } else {
                newElem.setAttribute(attr, simpleAttributes[attr]);
            }
        }
        
        const newElemSlots = newElem.querySelectorAll('slot');
        
        //перенести дочернии узлы в слоты
        if (entryChilds.length && newElemSlots.length) {

            //если нужно по слотам
            if (entrySlots.length) {

                for (let outSlot of entrySlots) {
                    const outSlotName = outSlot.getAttribute('name');
                    const outChilds = outSlot.childNodes;
                    
                    for (let inSlot of newElemSlots) {
                       const inSlotName = inSlot.getAttribute('name');
                       if (outSlotName == inSlotName) cloneChildToSlot(outChilds, inSlot); 
                    }
                    
                }

            //все в один слот    
            } else {

                cloneChildToSlot(entryChilds, newElemSlots[0]);

            }
        } 

        elem.parentElement.replaceChild(newElem, elem);

        //скопировать узлы в слот
        function cloneChildToSlot(childs, slot) {

            const fragment = document.createDocumentFragment();

            findComponents(childs);

            for (let child of childs) {
                const clonedChild = child.cloneNode(true);
                fragment.appendChild(clonedChild);
            }
            
            slot.parentElement.replaceChild(fragment, slot);

            return childs;
        }

        return elem;
    }

    //загрузка компонента
    /**
     * Загрузить компонент из файла.
     * 
     * @param {String} componentName - название компонента
     * @param {*} callback - колбек
     */
    function loadComponent(componentName, callback){
        fetch(`${__fast__.config.componentsDirectory}/${componentName}/${componentName}.html`)  
        .then(function(response) {
            return response.text()
        })
        .then(function(context) {
            callback(context, componentName);
        })
        .catch(function(err) {  
            console.log(`Failed to fetch component ${componentName}: `, err);  
        });    
    }

    /**
     * Инсталировать компонент в `__fast__.components[componentName]`.
     * 
     * @param {String} context - строка, содержимое файла компонента
     * @param {String} componentName - название компонента
     */
    function installComponent(context, componentName) {
        const parser = new DOMParser();
        const fragment = parser.parseFromString(context, "text/html");
        const fragmentTemplate = fragment.querySelector('template').content;
        const fragmentScript = (function(){
            const raw = fragment.querySelector('script').innerText.trim();
            const methods = {
                beforeMount: null,
                mount: null,
                ...new Function(`return ${raw.slice(1, raw.length - 1)}`)()
            }
            return methods;
        })();
        const fragmentStyle = fragment.querySelector('style').textContent.replaceAll(
            '@component', 
            `${__fast__.config.componentsDirectory}/${componentName}/assets`
        );

        const props = (fragmentScript.props) ? fragmentScript.props : {};
        const methods = (fragmentScript.methods) ? fragmentScript.methods : {};
        const template = (function(props, fragmentTemplate){
            props = props || {};
            let propsKeys = [];
            let html = fragmentTemplate.children[0].outerHTML;
            for (let p in props) {
                propsKeys.push(p);
            }

            let vars = '';
            for (let v in propsKeys) {
                vars += `const ${propsKeys[v]} = (props.${propsKeys[v]} && props.${propsKeys[v]}.value) ? props.${propsKeys[v]}.value : 'undefined';\n`
            }

            return new Function('props', `${vars} return \`${html}\``);

        })(props, fragmentTemplate)

        const component = {
            template: template,
            style: fragmentStyle,
            props: props,
            methods: methods
        }

        addStyles(fragmentStyle);

        __fast__.components[componentName] = component;

        return component;
    }

    /**
     * Добавляет правила css.
     * 
     * @param {String} cssRules - строка с css
     */
    function addStyles(cssRules) {
        let fastStyles = document.getElementById('fast-styles')
        if (!fastStyles) {
            fastStyles = document.createElement('style');
            fastStyles.setAttribute('id', 'fast-styles');
            document.head.append(fastStyles);
        } 

        fastStyles.textContent += `${cssRules}\n`;

        return fastStyles.textContent;
        
    }


})()