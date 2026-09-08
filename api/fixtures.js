export function makeFixtures(teamIds){
  if(teamIds.length!==20) throw new Error('20 ta klub kerak');
  let arr=[...teamIds]; const rounds=[]; const n=arr.length;
  for(let r=0;r<n-1;r++){
    const games=[];
    for(let i=0;i<n/2;i++){
      let a=arr[i], b=arr[n-1-i];
      if((r+i)%2===0) games.push([a,b]); else games.push([b,a]);
    }
    rounds.push(games);
    arr=[arr[0],arr[n-1],...arr.slice(1,n-1)];
  }
  const second=rounds.map(g=>g.map(([h,a])=>[a,h]));
  return [...rounds,...second];
}
