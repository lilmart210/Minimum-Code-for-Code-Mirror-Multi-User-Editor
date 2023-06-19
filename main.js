//const {WebSocket, { WebSocketServer }} = require('ws');
const ws = require('ws');

const {ChangeSet,Text} = require('@codemirror/state');


let updates = [];
const pending = [];

let doc = Text.of(['I shall enact the zero mortal plan ']);



const wss = new ws.WebSocketServer({
  port: 6776
});



wss.on('connection',(socket,req)=>{
  
    socket.on('open',()=>{

    })
    
    socket.on('message',function(message){
      
      const info = Buffer.from(message).toString();
      const data = JSON.parse(info);
      if(!data) return;
      

      if(data.type == 'pullUpdates'){
        if(data.version < updates.length){
          console.log('rejected');
          const adif = Math.max(0,(updates.length - data.version) - 1);
          socket.send(JSON.stringify({type : 'pullUpdates', updates : updates.slice(adif)}));
        }else {
          console.log('future');
          //should i send back the correct document?
          socket.send(JSON.stringify({type : 'pullUpdates', updates : []}));
        }
      }

      else if(data.type == 'pushUpdates'){
        if(data.version != updates.length){
          console.log('wrong ength',data.version,updates.length);
          //don't send data...correct the document first
          socket.send(JSON.stringify({type : 'action', action : 'pullUpdates'}));
        }else {
          //console.log(doc.length,doc,updates.length,JSON.stringify(data.updates));
          console.log(doc.length,updates.length,data.version,data.updates.length,JSON.stringify(data.updates));

          const upd = [];
          for(let update of data.updates){
            try{
              //json to changeset
              let changes = ChangeSet.fromJSON(update.changes);
              updates.push({changes,clientID : update.clientID});
              if(data.updates.length > 2) {console.log(update,'going updates')}
              doc = changes.apply(doc);
              upd.push(update);
            }catch(e) {
              console.log(e,'skip');
            }
          } 
          //tell clients to update themselves..... 
          wss.clients.forEach(function UpdateSocket(client){
            //Ideally, i would have a courotine either here or client side,
            //that would trigger every so often, like a handshake or ping
            //that would then grab any updates if any arrived.
            if(client.readyState == ws.OPEN){
              client.send(JSON.stringify({type : 'pullUpdates', updates : upd}));
            }
          })
        }
      }

      else if(data.type == 'getDocument'){
        socket.send(JSON.stringify({type : 'getDocument',version : updates.length,doc : doc.toString()}));
      }
    })
})

