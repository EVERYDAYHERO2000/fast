import config from '../src/config.js';

const __fast__ = window.__fast__ = {components:{}};

function loadComponent(componentName, callback, response){
    fetch(`src/components/${componentName}/${componentName}.html`)
    .then(function(response) {
        return response.text()
    })
    .then(function(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const fragmentTemplate = doc.querySelector('template').content;
        const fragmentStyle = doc.querySelector('style');
        const fragmentScript = (function(){
            const raw = doc.querySelector('script').innerText.trim();
            const methods = {
                beforeMount: null,
                mount: null,
                ...new Function(`return ${raw.slice(1, raw.length - 1)}`)()
            }
            return methods;
        })();
        
        fragmentTemplate.__fast__ = fragmentScript;

        const component = __fast__.components[componentName] = {
            style: fragmentStyle,
            template: fragmentTemplate
        }

        callback(component);
        response();

    })
    .catch(function(err) {  
        console.log(`Failed to fetch component ${componentName}: `, err);  
    });
}

function loadComponents(callback){
    for (let c in config.components){
        loadComponent(config.components[c], 
            function(c){
                document.head.append(c.style);
            },
            function(){
                if (c == config.components.length - 1) {
                    buildComponents();
                    callback();
                }
            }
        )
    }
}

function buildComponents(){
    for (let c in __fast__.components) {

        const component = render(__fast__.components[c].template);

        __fast__.components[c].template = component;

        //console.log(component, __fast__.components[c].template)

    }
}

function render(target){
    const elems = (target) ? target.querySelectorAll('*') : document.querySelectorAll('body *');
    const rootElem = elems[0];  

    for (let e of elems){
        
        rewrite(e);
    } 

    function rewrite(elem) {
        const name = elem.tagName[0] + elem.tagName.toLowerCase().slice(1);

        
        if (__fast__.components[name]){
            const template = (function(){
                let tpl;
                if (target) {
                    tpl = (__fast__.components[name].template.querySelector('*')) ? 
                    __fast__.components[name].template.querySelector('*') : 
                    __fast__.components[name].template;
                } else {
                    tpl = __fast__.components[name].template;
                }
                return tpl;
            })().cloneNode();

            const slot = template.querySelector('slot');

            const childs = elem.childNodes;
            const attributes = (() => {
                const result = {};
                for (let a of elem.attributes){
                    result[a.nodeName] = a.nodeValue;
                }
                return result;
            })();

            console.log(slot, template);

            //template = template.cloneNode();

            template.__fast__ = {...__fast__.components[name].template.__fast__};
            
            if (childs.length) template.append(...childs);

            if (template.__fast__.beforeMount) template.__fast__.beforeMount(); 

            elem.parentElement.replaceChild(template, elem);
    
            template.__fast__.el = template;
            
            if (template.__fast__.mount) template.__fast__.mount(); 

        }

        //console.log('template', elem)
    }
     
    return rootElem;
} 

__fast__.render = render;





loadComponents(function(){
    render();
});
