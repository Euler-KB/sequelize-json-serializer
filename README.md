# Sequelize-Json-Serializer
A simple and fast convention based library for serializing sequelize models to JSON.

### Basic Usage
```js
conse Sequelize = require("sequelize");
const Serialzer = require("sequelize-json-serializer");

const User = sequelize.define("users",{
username: { type: Sequelize.STRING(128) },
email: { type: Sequelize.STRING(256) },
phone: { type: Sequelize.STRING(128) },
country: { type: Sequelize.STRING }
});

const UserSchema = {

fields: [
'username',
'email',
'phone',
'country'
]
};

Serializer.defineSchema(  User , UserSchema );
```