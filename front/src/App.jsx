import { useEffect, useRef, useState } from 'react'
import './App.css'
import { EditorView } from 'codemirror'
import { ChangeSet, EditorState,Text} from '@codemirror/state'
import { ViewPlugin, ViewUpdate } from '@codemirror/view'
import * as codeCollab from '@codemirror/collab'


//https://codemirror.net/examples/collab/
//https://codemirror.net/docs/ref/#collab


function App() {
  const [count, setCount] = useState(0)
  let [aws,setaws] = useState(null);
  const [msg,setMsg] = useState(null);

  let [collab,setCollab] = useState(null);

  const editor = useRef(null);
  const [connected,setConnected] = useState(false);


  //peer extension
  function peerExtension(startVersion){
    let plugin = ViewPlugin.fromClass(
      class {
        

        constructor(view){
          this.view = view;
          aws.addEventListener('message',(e)=>{this.onmsg(e)});
          this.push = this.push.bind(this);
          this.pull = this.pull.bind(this);
          this.onmsg = this.onmsg.bind(this);

          this.blocking = false;
        };

        //codeCollab.recieveUpdates(this.view.state,newupdates)
        //ChangeSet.fromJson(u.changes)

        onmsg(event){
          if(event.data){
            const parsed = JSON.parse(event.data);
            const respt = parsed.type;
            if(respt == 'pullUpdates'){
              //console.log("pull",parsed);
              const newUpd = parsed.updates.map(u=>({
                changes : ChangeSet.fromJSON(u.changes),
                clientID : u.clientID
              }));

              this.view.dispatch(codeCollab.receiveUpdates(this.view.state,newUpd));
              this.blocking = false;
              this.push();
            }
            else if(respt == 'action'){
              //console.log("action",parsed);
              if(parsed.action == 'pullUpdates') this.pull();
            }
            else if(respt == 'pushUpdates'){
              //console.log("push",parsed);
              this.blocking = false;
              //incase of a build up, run again
              this.push();
            }
          }
        }
        
        update(update){
          //the view changed, send changes to the server
          if(update.docChanged){
            this.push();
          }
        }

        async push(){
          let updates = codeCollab.sendableUpdates(this.view.state).map(u => ({
            clientID : u.clientID,
            changes : u.changes.toJSON()
          }));
          //console.log(this.blocking);
          //is a death loop possible here?
          if(this.blocking || !updates.length) return;
          //push updates to the server | doesn't matter what the result is
          this.blocking = true;
          const newvers = codeCollab.getSyncedVersion(this.view.state);
          aws.send(JSON.stringify({type : 'pushUpdates',version : newvers,updates : updates}))

        }

        //
        async pull(){
          const version = codeCollab.getSyncedVersion(this.view.state);
          aws.send(JSON.stringify({type : 'pullUpdates', version : version}));
        }

        //stop whatever we was doing
        destroy() {
          this.blocking = false;
          aws.removeEventListener('message',this.onmsg);
        }

      }
    )

    return [codeCollab.collab({startVersion}),plugin]
  }

  //on message sent/recieved | disconnect after peer constructor established
  function onMsg(event){
    //console.log("msg", event)
    if(event.data){
      const parsed = JSON.parse(event.data);
      //console.log(parsed);
      const respt = parsed.type;
      //get starting document
      if(respt == 'getDocument'){
        const starttext = Text.of(parsed.doc.split('\n'));
        //peer extension goes into extensions;
        const newState = EditorState.create({
          doc : starttext,
          extensions : [
            EditorView.lineWrapping,
            peerExtension(parsed.version)
          ]
        })

        collab.setState(newState)
      }
    }
  }

  function onOpen(event){
    //console.log('open',aws,event)    
    aws.send(JSON.stringify({type : 'getDocument'}))
  }

  //initialize
  useEffect(()=>{
    const ws = new WebSocket('ws://192.168.0.43:6776');
    //listeners 
    ws.addEventListener('open',onOpen);
    ws.addEventListener('message',onMsg);

    aws = ws;
    //get rid of double rendering of elements
    const pack = editor.current;
    if(pack){
      while(pack.firstChild) pack.removeChild(pack.firstChild);
    }
    //make new view
    const myview = new EditorView({
      parent : editor.current,
      extensions : [EditorView.lineWrapping]
    })
    
    collab = myview;

    return ()=>{
      if(aws) aws.close();
      
    }

  },[])

  //peer extension




  return (
    <div className="App">
      <h1>Whats good Slime? <br/> {msg}</h1>
      <div className = 'Editor' ref={editor}> </div>
    </div>
  )
}

export default App
