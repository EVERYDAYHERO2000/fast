(function(){

    const __fast__ = window.__fast__ = {
        components: {},
        config: {
            tagSign: ':',
            components: [],
            css: {

            }
        },
        findComponents: findComponents
    }

    const allElems = document.body.querySelectorAll('*');

    findComponents(allElems);

    //найти в коллекции все компоненты
    function findComponents(elems){
        for (const elem of elems) {

            const tagName = elem.tagName;

            // если : то компонент
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
                    newElem.getAttribute(attr) + ' ' + simpleAttributes[attr]
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
    function loadComponent(componentName, callback){
        fetch(`src/components/${componentName}/${componentName}.html`)  
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

    //инсталирование компонента
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
        const fragmentStyle = fragment.querySelector('style');

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
                vars += `const ${propsKeys[v]} = props.${propsKeys[v]}.value || 'undefined';\n`
            }

            return new Function('props', `${vars} return \`${html}\``);

        })(props, fragmentTemplate)

        const component = {
            template: template,
            style: fragmentStyle,
            props: props,
            methods: methods
        }

        fragmentStyle.innerText = fragmentStyle.innerText.replaceAll('@component', `src/components/${componentName}/assets`);

        document.head.appendChild(fragmentStyle);

        __fast__.components[componentName] = component;

        return component;
    }


})()