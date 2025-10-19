import React, { useEffect, useState, useRef } from "react";

const WORDS = [
  "SOUNDNESS","PROOF","SUBMITTED","SUCCESSFULL","SUI","WALRUS","LIGERO","LINERA",
  "BLOCKCHAIN","ZKP","QUANTUM","ZIPPY","BLU","WAVA","BLOOP","ECHO","WENDY","PHAXY",
  "SAGE","ONBOARDED","ERROR","EXPIRED","GITHUB","CLI","CODESPACE","KARAOKE"
];

const GRID_SIZE = 16;
const GAME_DURATION = 120;
const DIRECTIONS = [
  {dr:0, dc:1},{dr:0, dc:-1},{dr:1, dc:0},{dr:-1, dc:0},
  {dr:1, dc:1},{dr:1, dc:-1},{dr:-1, dc:1},{dr:-1, dc:-1}
];

function randInt(n){ return Math.floor(Math.random()*n); }
function shuffle(a){ const arr=a.slice(); for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
function createEmptyGrid(){ return Array(GRID_SIZE).fill(null).map(()=>Array(GRID_SIZE).fill('')); }
function canPlace(grid, word, r, c, dir){
  const endR = r + (word.length-1)*dir.dr;
  const endC = c + (word.length-1)*dir.dc;
  if(endR < 0 || endR >= GRID_SIZE || endC < 0 || endC >= GRID_SIZE) return false;
  for(let i=0;i<word.length;i++){
    const rr = r + i*dir.dr; const cc = c + i*dir.dc; const ch = grid[rr][cc];
    if(ch && ch !== '' && ch !== word[i]) return false;
  }
  return true;
}
function placeWordIntoGrid(grid, word){
  const tries = 400;
  const directions = shuffle(DIRECTIONS);
  for(let t=0;t<tries;t++){
    const dir = directions[t % directions.length];
    const r = randInt(GRID_SIZE);
    const c = randInt(GRID_SIZE);
    if(canPlace(grid, word, r, c, dir)){
      for(let i=0;i<word.length;i++) grid[r + i*dir.dr][c + i*dir.dc] = word[i];
      return {r,c,dir};
    }
    const rev = word.split('').reverse().join('');
    if(canPlace(grid, rev, r, c, dir)){
      for(let i=0;i<rev.length;i++) grid[r + i*dir.dr][c + i*dir.dc] = rev[i];
      return {r,c,dir,reversed:true};
    }
  }
  return null;
}
function placeAllWords(words){
  for(let attempt=0; attempt<12; attempt++){
    const grid = createEmptyGrid();
    const placements = {};
    let ok = true;
    const order = shuffle(words);
    for(const w of order){
      const p = placeWordIntoGrid(grid, w);
      if(!p){ ok=false; break; }
      placements[w]=p;
    }
    if(!ok) continue;
    for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++) if(!grid[r][c]) grid[r][c] = String.fromCharCode(65+randInt(26));
    return {grid,placements};
  }
  const grid = createEmptyGrid();
  for(let r=0;r<GRID_SIZE;r++) for(let c=0;c<GRID_SIZE;c++) grid[r][c]=String.fromCharCode(65+randInt(26));
  return {grid,placements:{}};
}

function normalizeStep(dr, dc){ if(dr===0&&dc===0) return null; const sgr=dr===0?0:dr/Math.abs(dr); const sgc=dc===0?0:dc/Math.abs(dc); if(!(dr===0||dc===0||Math.abs(dr)===Math.abs(dc))) return null; return {sr:sgr,sc:sgc}; }
function cellsBetween(start,end){ const dr=end[0]-start[0]; const dc=end[1]-start[1]; const step=normalizeStep(dr,dc); if(!step) return null; const len=Math.max(Math.abs(dr),Math.abs(dc))+1; const cells=[]; for(let i=0;i<len;i++) cells.push([start[0]+i*step.sr,start[1]+i*step.sc]); return cells; }

export default function App(){
  const initial = placeAllWords(WORDS);
  const [gridData, setGridData] = useState(initial);
  const [found, setFound] = useState({});
  const [startCell, setStartCell] = useState(null);
  const [selectionCells, setSelectionCells] = useState([]);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(GAME_DURATION);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const timerRef = useRef(null);

  useEffect(()=>{
    // show loader for 2s on initial load
    setShowLoader(true);
    const t = setTimeout(()=>{ setShowLoader(false); },2000);
    return ()=>clearTimeout(t);
  },[]);

  useEffect(()=>{
    if(running && secondsLeft>0){
      timerRef.current=setTimeout(()=>setSecondsLeft(s=>s-1),1000);
    } else if(secondsLeft===0 && running){
      endRound();
    }
    return ()=>clearTimeout(timerRef.current);
  },[running, secondsLeft]);

  function startGame(){
    setGridData(placeAllWords(WORDS));
    setFound({}); setScore(0); setSecondsLeft(GAME_DURATION);
    setStarted(true); setRunning(true); setShowPopup(false);
  }
  function pauseResume(){ setRunning(r=>!r); }

  function endRound(){
    setRunning(false); setShowPopup(true);
  }

  function onMouseDownCell(r,c){
    if(!running) return;
    setStartCell([r,c]); setSelectionCells([[r,c]]);
    document.addEventListener('mouseup', onMouseUpDocument);
  }
  function onMouseEnterCell(r,c){
    if(!startCell || !running) return;
    const cells = cellsBetween(startCell, [r,c]);
    if(cells) setSelectionCells(cells);
  }
  function onMouseUpDocument(){
    document.removeEventListener('mouseup', onMouseUpDocument);
    if(!startCell || !running) { setSelectionCells([]); setStartCell(null); return; }
    if(selectionCells.length < 2){ setSelectionCells([]); setStartCell(null); return; }
    const word = selectionCells.map(([rr,cc])=> gridData.grid[rr][cc]).join('');
    const rev = word.split('').reverse().join('');
    const match = WORDS.find(w=> w === word || w === rev);
    if(match && !found[match]){
      setFound(prev=>({...prev, [match]: selectionCells}));
      setScore(s=>s+1);
    }
    setSelectionCells([]); setStartCell(null);
  }

  function shareToTwitter(){
    const text = `I just scored ${score} points on Soundness Scrabble game built by Angelmykl! 🔠`;
    const url = encodeURIComponent("https://soundness-scrabble.vercel.app");
    const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}&hashtags=SoundnessScrabble,WordGame`;
    window.open(tweet, "_blank", "noopener");
  }

  const allFound = Object.keys(found).length === WORDS.length;
  const minutes = Math.floor(secondsLeft/60), secs = secondsLeft%60;

  return (
    <div className="app">
      {showLoader ? (
        <div className="loader fadeIn">
          <svg className="dolphin" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path fill="#fff" d="M53.6 21.7c-1.6-.7-4-.9-6.6-.8-2.8.2-5.4.7-7.3 1.6-1.7.8-3.2 1.9-4.3 3.2-1.7 1.9-3.2 4.4-4.7 7.3-1 2-2 4-3.3 5.6-1.4 1.8-3.2 3.2-5.3 4.2 2.7 1.4 5.8 2.3 9 2.6 3.6.4 7.3-.1 10.2-1.4 2.6-1.2 4.8-3 6.2-5.1 1.2-1.8 1.8-3.8 1.6-5.8-.2-1.5-.9-2.9-2.1-3.7z"/>
          </svg>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:6}}>Soundness Scrabble</h2>
          <div style={{opacity:0.95}}>Game Built by Angelmykl</div>
        </div>
      ) : (
        <>
        {!started && (
          <div style={{display:'flex',justifyContent:'center',marginTop:30}}>
            <button className="btn" onClick={startGame}>Start Game</button>
          </div>
        )}
        {started && (
          <>
          <div className="header">
            <div className="title">Soundness Scrabble — Word Search</div>
            <div className="controls">
              <div className="timerBox">
                <div style={{fontSize:11,color:'#2563eb'}}>Time</div>
                <div className="timerBig">{minutes}:{String(secs).padStart(2,'0')}</div>
              </div>
              <button className="btn secondary" onClick={pauseResume}>{running? 'Pause' : 'Resume'}</button>
              <div style={{background:'#ebf5ff',padding:'6px 10px',borderRadius:8,textAlign:'center'}}>
                <div style={{fontSize:11,color:'#2563eb'}}>Score</div>
                <div style={{fontSize:20,fontWeight:800,color:'#1d4ed8'}}>{score}</div>
              </div>
            </div>
          </div>

          <div className="layout" style={{marginTop:12}}>
            <div className="boardWrap">
              <div className="grid">
                {gridData.grid.map((row,r)=>row.map((ch,c)=>{
                  const key = `${r}-${c}`;
                  const isSel = selectionCells.some(([rr,cc])=> rr===r && cc===c);
                  const isFound = Object.values(found).some(cells=> cells.some(([rr,cc])=> rr===r && cc===c));
                  return <div key={key} className={`cell ${isFound? 'found' : isSel? 'sel' : ''}`} onMouseDown={()=>onMouseDownCell(r,c)} onMouseEnter={()=>onMouseEnterCell(r,c)}>{ch}</div>;
                }))}
              </div>
            </div>

            <div className="side">
              <div className="card">
                <h3 style={{marginTop:0,color:'#1d4ed8'}}>Find these words</h3>
                <div className="wordList">
                  {WORDS.map(w=>{
                    const isFound = !!found[w];
                    return <div key={w} className={`wordItem ${isFound? 'found' : ''}`}><span>{w}</span>{isFound && <span style={{background:'#1e3a8a',color:'white',padding:'3px 6px',borderRadius:6,fontSize:12}}>Found</span>}</div>;
                  })}
                </div>
              </div>

              <div style={{height:12}} />

              <div className="card" style={{marginTop:12}}>
                <h4 style={{marginTop:0,color:'#1d4ed8'}}>Tips</h4>
                <ol style={{paddingLeft:16}}>
                  <li>Look for uncommon letters (Q, Z, X)</li>
                  <li>Click first letter, drag to last, release</li>
                  <li>Found words turn blue on the board</li>
                </ol>
              </div>
            </div>
          </div>

          {allFound && <div style={{marginTop:12,padding:10,background:'#e6f0ff',color:'#1e40af',borderRadius:8}}>🎉 You found all words!</div>}

          {showPopup && (
            <div className="popupOverlay">
              <div className="popup fadeIn">
                <h2>⏰ Time's Up!</h2>
                <p>You scored <strong>{score}</strong> points!</p>
                <div>
                  <button className="btn" onClick={()=>{ setShowPopup(false); /* wait for player to click play again */ }}>Close</button>
                  <button className="shareBtn" onClick={shareToTwitter}>Share on Twitter</button>
                </div>
                <div style={{marginTop:12}}>
                  <button className="btn secondary" onClick={()=>{ setShowPopup(false); setStarted(false); setScore(0); setSecondsLeft(GAME_DURATION); setFound({}); }}>Play Again</button>
                </div>
              </div>
            </div>
          )}
          </>
        )}
        </>
      )}
    </div>
  );
}