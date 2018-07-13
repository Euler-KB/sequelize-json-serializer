
# Sequelize-Json-Serializer    
A simple and fast convention based library for serializing sequelize models to JSON.    
    
### Basic Usage    
```js    
conse Sequelize = require("sequelize");    
const Serialzer = require("sequelize-json-serializer");  
  
const User = sequelize.define("users",{    
   id: { type: Sequelize.INTEGER , primaryKey: true , autoIncrement: true },  
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
    
Somewhere in your application:    
```js    
router.get('/user/:id',function(req,res,next) {    
    
    User.findById(req.params.id).then(user => {    
      
        const payload = Serializer.serialize( user,User);    
          
      /*  
      Response Body...  
      {  
         "id" : "2",  
         "username": "user360",  
         "email": "test@live.com",  
         "phone": "02XXXXXXXX",  
         "country": "Ghana"  
      }  
      */  
        
        res.status(200).json( payload );    
    });    
});    
```  
  
From above, the default convention ensures the primary key attribute is included by default. To prevent this behavior,  set **excludePK** option in the schema to **true** .  
  
> The serialize method works for both arrays and sequelize models  
  
```js  
const UserSchema = {  
     
   fields: [  
        'username',    
        'email',    
        'phone',    
        'country'    
   ],  
     
   options: {  
      excludePK: true // Exclude primary key 'id'  
   }  
     
}  
```  
  
### Formatting fields  
Formatting can be applied to defined fields in schema to alter the output of values. See how  
  
```js  
  
const UserSchema = {  
     
   fields: [  
      'username',    
      'email',    
      'phone',    
      'country'    
   ],  
     
   options: {  
     
      formatter: (key,value, model) => {  
         return value.startsWith('$') ? null : value;  
      }  
   }  
     
}  
  
```   
  
### Renaming Fields  
Fields can be renamed by setting the fields to an object following the syntax    
```   
 [raw_field] : [new_name]  
```  
#### Rename Field Example  
```js  
const UserSchema = {    
    
    fields: {  
       ...  
       'username': 'user_name',  
       'phone': 'phone_number',  
       'email': '' // no renaming done here  
    }  
};    
   
User.findById(2).then(user => {  
  
   // serialize model to json object    
   const result = Serializer.serialize(user,User);  
     
   /*  
   result ...  
   {  
      "user_name:" "user260",  
      "phone_number" : "02XXXXXXXXX"  
      "email": "test@email.com"  
   }  
   */  
  
     
});  
```  
  
### Serializer Options  
You can control how models are serialized by passing an options argument to the serializer  
|Option  | Description  |  
|-|--|  
| **serializer** | Indicates the type of serializer to use. Possible values include '**model**' and '**raw**'. Model is only supported at the moment  |  
| **emptyPolicy** | Defines the policy that is used when a field is not available or found during serialization. Possible values include **SET_NULL**, **SET_UNDEFINED** and **IGNORE** (default).   |  
|**includeAll**| Controls whether to automatically serialize all include properties. Default is ***false***
  
 ### Set options
```js     
const Serializer = require("sequelize-json-serializer");  
  
Serializer.setOptions({  
   serializer: "model",  
   includeAll: true,	// Forces all included properties to be serialied 
   emptyPolicy: Serializer.NullPolicy.IGNORE // Will ignore any field that cannot be found in the model beign serialized  
})  
```  
  
  
### Including Other Defined Schemas  
You can mix a schema with others by specifying them in the include section.  
#### Example  
```js  
  
const Sequelize = require("sequelize");  
  
const sequelize = /*setup db connection*/  
  
const Serializer = require("sequelize-json-serializer");  
  
const Teacher = sequelize.define("teacher",{  
   id: { type: Sequelize.INTEGER , primaryKey: true , autoIncrement: true },  
   school_id: { type: Sequelize.INTEGER }, // make this a foreign key  
   name: Sequelize.STRING  
});  
  
const TeacherSchema = {  
   fields: ['name']  
};  
  
const School = sequelize.define("school", {  
   id: { type: Sequelize.INTEGER , primaryKey: true , autoIncrement: true },  
   name: Sequelize.STRING,  
   location: Sequelize.STRING,  
   courses: Sequelize.STRING  
});  
  
const SchoolSchema = {  
  
   fields: [  
      'name',  
      'location',  
      'courses'  
   ],  
  
   include: {  
      'teacher':  Teacher // Simplified syntax  
   },  
     
   options: {  
     
      // Define formatting for single properties. Only works on fields...  
      propertyFormat: {   
        
         name: (value) => {  
             return value.trim(); // always trim school name  
         },  
        
         location: value => {  
            return value.replace(/,/g,'.');  
         },  
           
         courses: (value) => {  
            return value ? value.split(',') : []  
         }  
      }  
   }  
}  
  
  
  
  
// Define User schema  
const UserSchema = {    
    
    fields: [  
      'username',  
      'email'  
      'phone',  
      'country'  
    ],  
     
   include: {  
     
      // define property 'school' on output model  
      'school': {  
         model: School,    // the sequelize model.  
         field: 'schools',  // the raw field name in users model  
         association: 'many' // [single] or [many]  
      }  
        
   }  
     
};   
  
// Define school schema   
Serializer.defineSchema( School , SchoolSchema );  
  
// Define teacher schema   
Serializer.defineSchema( Teacher, TeacherSchema );  
  
// Define user schema   
Serializer.defineSchema( User, UserSchema );  
  
// Usage   
--------------------------------------------  
  
// ### Single Entity  
  
User.findById(100, {  
   include: {  
      model: School,  
      include: Teacher  
}).then(user => {  
  
   //  
   const result = Serializer.serialize(user,User , {       
      include: { all: true } //  include all properties defined in include section.       
   });  
     
   /*   
   {  
      "id" : 2  
      "username": "user360" ,  
      "email": "user@email.com",  
      "phone": "02XXXXXXXX",  
      "country": "Ghana",  
      "school": {  
         "id": 1,  
         "name": "Havard",  
         "location" : "US"  
         "courses": [ "Quantum Computing" , "Electrical Engineering" ],  
         "teacher": {      
            "id": 20,  
            "name": "Albert Massouli"  
         }  
      }  
   }  
  */
  
});  
```  
  
### Schema Tags  
Schema tags allow defining multiple schema for a single model. It can be useful in scenarios where responses are  different for other entities (eg. user account types). Below is a typical example  
  
```js  
  
// #Example  
  
const Request = sequelize.define("request", {  
   id : { type: Sequelize.INTEGER , primaryKey: true, autoIncrement: true },  
   type: { type: Sequelize.INTEGER },  
   name: { type: Sequelize.STRING },  
   email: { type: Sequelize.STRING }  
},{  
   timestamps: true,  
   updatedAt: "last_updated",  
   createdAt: "date_created"  
})  
  
const User = sequelize.define("user",{  
   id : { type: Sequelize.INTEGER , primaryKey: true, autoIncrement: true },  
   fullname: { type: Sequelize.STRING },  
   email: { type: Sequelize.STRING },  
   user_type: { type: Sequelize.STRING }, // Distinguishes users. Can be 'regular'or 'admin'  
},{  
   timestamps: true,  
   updatedAt: "last_updated",  
   createdAt: "date_created"  
});  
  
```  
  
### Defining schema for different user accounts *(or roles)*  
#### Admin Schema  
Here we define the response structure for administrative calls  
```js  
const AdminRequestSchema = {  
     
   fields: {  
      'type': 'request_type',      
      'date_created': '', // no renaming..  
      'last_updated': ''  
   },  
     
   include: {  
     
      'sender': {  
         model: User,  
         field: "user",  
         // association: "single" --- Default is always single  
      }  
        
   }  
}  
  
// Define schema  
Serializer.defineSchema( AdminRequestSchema  , Request , "admin"  );  // don't forget to set the last parameter to 'admin'  
  
```  
  
#### Regular User Schema  
Define response structure of regular user calls  
```js  
const RegularRequestSchema = {  
  
   fields: {  
      'type': 'request_type',  
      'name': 'sender_name'  
   }  
}  
  
// Define schema for regular users  
Serializer.defineSchema( RegularRequestScheam , Request ,"regular");  
```  
  
### Testing schema  
We've now defined two schemas for **Request** model. We can serialize based on user account and prevent eavesdropping on other detailed properties of the sender's user account to a regular user call.  
  
```js  
  
router.get('/:id', /**authentication middleware here*/, function(req,res,next){  
     
   const user = req.user;  
  
   Request.findById(req.params.id,{  
      include: {  
         model: User  
      }  
   }).then(request => {  
        
      const payload = Serializer.serialize( request , Request , {   
         include: { all: true },  
         tags: [ user.user_type ] // set the tags for the schema to use  
      });  
  
      /*  
         user_type = regular  
         --------------------------------------  
         {  
            "id": 2,  
            "request_type": 5,  
            "sender_name": "Test User"  
         }  
  
         user_type = admin  
         --------------------------------------  
         {  
            "id": 2,  
            "request_type": 5,  
            "sender": {  
               "id" : 1,  
               "fullname": "Test User",  
               "email": "test@email.com",  
               "user_type" : "admin",  
               "date_created": "2018-07-12T10:55:28.081Z",  
               "last_updated": "2018-07-12T10:55:28.081Z"  
            }  
         }  
      */  
  
   })  
     
  
});  
  
```
