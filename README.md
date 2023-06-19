# This is a minimum example using a front/backend for code mirror.


> Main.js is the backend for the example
> inside of folder 'front' app.jsx contains the entire front end logic.

> A Problem I can't make sense of is that this line in main.js is almost like magic. Without it the front end spams the backend. Fix later as it should just be ```updates.slice(data.version)```
```javascript
    const adif = Math.max(0,(updates.length - data.version) - 1);
    socket.send(JSON.stringify({type : 'pullUpdates', updates : updates.slice(adif)}));
```


> To run the back end use ```npm run start```.
> to run the front end use ```npm run dev```
> after using ```cd front```.
> make sure to run ```npm install``` in both the root and main folder


> do use promises.
