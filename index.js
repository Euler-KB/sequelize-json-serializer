const _ = require('lodash');
const Sequelize = require('sequelize');
const SchemaData = [];

Array.prototype.contains = function(value) {
    return this.indexOf(value) >= 0;
};

String.prototype.contains = function(value) {
    return this.indexOf(value) >= 0;
};

const ValueFormatters = {
    'date': (value) => new Date(value),
    'number': (value) => value === null ? null : Number(value),
    'string': (value) =>  (value !== undefined || value !== null)  ? value.toString() : value
};

function getSubModel(current, next) {
    return current ? `${current}.${next}` : next;
}

function handleNull(obj, property, policy) {
    switch (policy === undefined ? Options.emptyPolicy : policy) {
        case NullPolicy.SET_NULL:
            obj[property] = null;
            break;
        case NullPolicy.SET_UNDEFINED:
            obj[property] = undefined;
            break;
        case NullPolicy.IGNORE:
            break;
    }
}

const Serializers = Object.freeze({

        //  Raw serializer
        Raw: {

            serialize: (instance, model, options) => {

            //  TO BE IMPLEMENTED

        }

    },

    //  Model serializer
    Model: {

    serialize: (instance, model, options) => {

        options = options || {};
        const include = options.include || [];
        const emptyPolicy = options.emptyPolicy;
        const tags = options.tags;
        const _allIncluded = Options.includeAll || (typeof include === "object" && include.all === true);

        const schema = getModelSchema(model , tags);

        if (Array.isArray(instance)) {

            if (schema.options && schema.options.handleMany === true && _.isFunction(schema.fields)) {
                return schema.fields(instance);
            }
            else {

                let values = [];
                for (let i = 0; i < instance.length; i++)
                    values.push(_modelSerialize(instance[i], schema, model, undefined ));

                return values;
            }
        }
        else {
            return _modelSerialize(instance, schema, model,undefined);
        }


        function formatPropertyValue(property,type,value) {

            if(typeof type === "function"){
                return type(value);
            }

            const vFormat = ValueFormatters[type.toLowerCase()];
            return vFormat ? vFormat(value) : value;
        }

        function processPropertyFormat(formatOptions,property,value){

            if(formatOptions && formatOptions[property]){
                return formatPropertyValue(property,formatOptions[property],value);
            }

            return value;
        }

        function _modelSerialize(value, schema, model, preModels , _tags = "default") {

            const  options = schema.options || {};
            const  formatter = options.formatter;
            const  propFormat = options.propertyFormat;

            let fields = schema.fields;
            let targetModel;
            const valueGetter = 'getDataValue' in value ? function (value, key,included = false) {
                return included ? value[key] : value.getDataValue(key);
            } : function (value, key) {
                return value[key];
            };

            if (_.isArray(fields)) {
                targetModel = {};

                let props = [];
                if(!options['excludePK']){
                    props.push(model.primaryKeyAttribute);
                }

                props = props.concat(fields);

                for (let i = 0; i < props.length; i++) {
                    targetModel[props[i]] = processPropertyFormat(propFormat,props[i], formatter ? formatter(props[i], value[props[i]], value) : value[props[i]] );
                }

            }
            else if (_.isFunction(fields)) {
                targetModel = fields(value);
            }
            else if (_.isObject(fields)) {

                targetModel = { };

                if(!options['excludePK']){
                    targetModel[model.primaryKeyAttribute] = value[model.primaryKeyAttribute];
                }

                const fKeys = _.keys(fields);
                let k, v;
                for (let i = 0; i < fKeys.length; i++) {

                    k = fKeys[i];
                    v = schema.fields[k];

                    if (v === null || v.toString().length === 0) {
                        targetModel[k] = processPropertyFormat(propFormat,k, formatter ? formatter(k, valueGetter(value, k), value) : valueGetter(value, k) );
                    }
                    else if (_.isString(v)) {
                        targetModel[v] =  processPropertyFormat(propFormat,v, formatter ? formatter(k, valueGetter(value, k), value) : valueGetter(value, k));
                    }
                    else if (_.isFunction(v)) {
                        targetModel[k] = processPropertyFormat(propFormat,k, v(value) );
                    }

                }

            }

            if (schema.include) {

                let iKeys = _.keys(schema.include);
                let m, k, a, v, field, tsch;
                for (let p = 0; p < iKeys.length; p++) {

                    k = iKeys[p];
                    if (typeof schema.include[k] === "function" && !(schema.include[k].prototype instanceof Sequelize.Model)) {

                        if (_allIncluded || include.contains(getSubModel(preModels, k))) {
                            targetModel[k] = schema.include[k](value);
                        }
                        else {
                            handleNull(targetModel, k, emptyPolicy);
                        }
                    }
                    else {

                        m = getIncludeModel(schema, k);
                        field = getIncludeField(schema, k);

                        //  get schema
                        tsch = getModelSchema(m,_tags);

                        if (_allIncluded || include.contains(getSubModel(preModels, k))) {

                            a = getIncludeAssociation(schema, k);
                            switch (a) {
                                case 'many': {

                                    let values = valueGetter(value, field, true);
                                    if (typeof tsch.fields === "function") {
                                        targetModel[k] = tsch.fields(values);
                                    }
                                    else {

                                        let tValue = targetModel[k] = [];
                                        for (let t = 0; values && t < values.length; t++) {
                                            tValue.push(_modelSerialize(values[t], tsch, m, getSubModel(preModels, k)));
                                        }

                                    }

                                } break;
                                case 'single': {

                                    v = valueGetter(value, field, true );
                                    if (_.isNil(v)) {

                                        if (typeof tsch.fields === "function" && (tsch.options && tsch.options.handleNull === true)) {
                                            targetModel[k] = tsch.fields(v);
                                        }
                                        else {
                                            handleNull(targetModel, k, emptyPolicy);
                                        }

                                    }
                                    else {
                                        targetModel[k] = _modelSerialize(v, tsch, m, getSubModel(preModels, k));
                                    }

                                } break;
                            }

                        }
                        else {
                            handleNull(targetModel, k, emptyPolicy);
                        }

                    }

                }
            }

            return targetModel;
        }


    }
}

});

const NullPolicy = Object.freeze({
    SET_NULL: 0,
    SET_UNDEFINED: 1,
    IGNORE: 2
});

let Options = {
    serializer: Serializers.Model,
    emptyPolicy: NullPolicy.SET_NULL,
    includeAll: false
};

exports.NullPolicy = NullPolicy;

exports.setOptions = function (options) {

    let serializer = options ? options.serializer : null;
    if (typeof serializer === "string") {
        switch (serializer) {
            case "raw":
                serializer = Serializers.Raw;
                break;
            case 'model':
                serializer = Serializers.Model;
                break;
        }
    }

    Options = _.merge(Options, options);
};

exports.Serializers = Serializers;

exports.ValueFormatters = ValueFormatters;

/**
 * Define model schema
 */
function defineSchema(model, schema , tag = "default") {

    //  Check whether there's any existing one
    if(SchemaData.find(x => x.model == model && x.tag == tag)) {
        console.log(`Failed defining schema [Model: ${model}] : Tag - ${tag}`);
        return false;
    }

    SchemaData.push({
        model: model,
        schema: Object.freeze(schema),
        tag: tag
    });

    return true;
}

/**
 * Gets the model schema
 */
function getModelSchema(model,tag = "default") {

    if(Array.isArray(tag)){

        for(let i = 0 , len = tag.length ; i < len ; i++){

            const frame = SchemaData.find(x => x.model == model && x.tag == tag[i]);
            if(frame){
                return frame.schema;
            }

        }

    }
    else {
        const frame = SchemaData.find(x => x.model == model && x.tag == tag);
        if (frame) {
            return frame.schema;
        }
    }
}

/**
 * Resolves the field name to model name that can be used with ORM
 * @param {any} model The model that contains the field
 * @param {Array|String} fieldName The name of the field that you wish to find corresponding model name
 * @param {String} tag
 */
function resolveField(model, fieldName,tag = "default") {

    const schema = getModelSchema(model,tag);
    if (schema && !Array.isArray(schema.fields)) {

        const kf =Object.keys(schema.fields);

        if (Array.isArray(fieldName)) {

            let resolved = [];
            for (let i = 0; i < fieldName.length; i++) {

                let f = fieldName[i];
                let t = kf.find(x => schema.fields[x] == f);
                if (t) {
                    resolved.push(t);
                }
                else {
                    resolved.push(f);
                }

            }

            return resolved;

        }
        else {

            let t = kf.find(x => schema.fields[x] == fieldName);
            if (t) {
                return t;
            }

        }

    }

    //  revert to original field name
    return fieldName;
}

function getIncludeModel(schema, key) {
    let v = schema.include[key];
    if(v.prototype instanceof Sequelize.Model){
        return v;
    }

    switch (typeof v) {
        case "function":
            return v;
        case "object":
            return v.model;
    }
}

function getIncludeField(schema, key) {
    let v = schema.include[key];
    switch (typeof v) {
        case "function":
            return key;
        case "string":
            return v;
        case "object":
            return v.hasOwnProperty('field') ? v.field : key;
    }
}

function getIncludeAssociation(schema, key) {

    let v = schema.include[key];
    switch (typeof v) {
        case "object":
            return v.association || "single";
        case "function":
        case "string":
            return "single";
    }
}

exports.defineSchema = defineSchema;
exports.getSchema = getModelSchema;
exports.resolveField = resolveField;

exports.serialize = function (values, model, options) {

    let opts = options || {};
    const serializer = opts.serializer || Options.serializer;
    if (serializer) {

        if (Array.isArray(opts)) {
            opts = {
                include: opts
            };
        }

        return serializer.serialize(values, model, opts);
    }

};

exports.transformModel = function (model, payload,tag = "default") {

    const schema = getModelSchema(model,tag);
    if (schema) {

        const fields = schema.fields;
        if (typeof fields === "object" && !Array.isArray(fields)) {

            Object.keys(fields).forEach(k => {

                const changed = fields[k];
            if (changed && payload.hasOwnProperty(changed)) {
                payload[k] = payload[changed];
                delete payload[changed];
            }


        });
        }

    }

    return payload;

};
