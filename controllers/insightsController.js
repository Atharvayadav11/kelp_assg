import * as DBModel from '../model/DBModel.js';

const getOverlappingEvents=async(req,res)=>{
    try{
        const overlaps=await DBModel.getOverlappingEvents();

        const results=overlaps.map(overlap=>({
            overlapingEventsPairs:[{
                event_id:overlap.event1_id,
                event_name:overlap.event1_name,
                start_date:overlap.event1_start,
                end_date:overlap.event1_end,
            },
            {
                event_id:overlap.event2_id,
                event_name:overlap.event2_name,
                start_date:overlap.event2_start,
                end_date:overlap.event2_end,

            }
            ]
        }));

        res.json(results);
    }catch(err){
        console.error('Error fetching overlapping events:',err.message);
        res.status(500).json({error: err.message});
    }

}

const getTemporalGaps=async(req,res)=>{
try{
    const {startDate,endDate}=req.query;

    if(!startDate||!endDate){
        return res.status(400).json({error:'Start date and end date are required'});
    }
    const events=await DBModel.getEventsInRange(startDate,endDate);

    if(events.length<2){
        return res.json({
            message: "No significant temporal gaps"
        });
    }
let largestGap=null;
let maxGapDuration=0;

events.sort((a,b)=>new Date(a.start_date)-new Date(b.start_date));

for(let i=0;i<events.length-1;i++){
    const currentEventEnd= new Date(events[i].end_date);
    const nextEventStart= new Date(events[i+1].start_date);

    if(nextEventStart>currentEventEnd){
        const gapDuration= Math.round((nextEventStart-currentEventEnd)/60000);
        if(gapDuration>maxGapDuration){
            maxGapDuration=gapDuration;

            largestGap={
                startOfGap:currentEventEnd,
                endOfGap:nextEventStart,
                duration:gapDuration,

            }

}
}
}
if(largestGap){
    res.json(largestGap);

}else{
    res.json({
        message:"No significant temporal gaps"
    });
}}

    catch(err) {
        console.error('Error fetching temporal gaps:', err.message);
        res.status(500).json({error: err.message});
    }
}

const getEventInfluence=async(req,res)=>{
    try{
const {sourceEventId,targetEventId}=req.query;
if(!sourceEventId||!targetEventId){
    return res.status(400).json({error:'Source and target event ids are required'});
}
const allEvents=await DBModel.getAllEvents();
const eventMap=new Map();
allEvents.forEach(event=>{
    eventMap.set(event.event_id,event);

})
const adjacencyList= new Map();
allEvents.forEach(event=>{
    if(!adjacencyList.has(event.event_id)){
        adjacencyList.set(event.event_id,[]);
    }

    if(event.parent_event_id){
       
        if(!adjacencyList.has(event.parent_event_id)){
            adjacencyList.set(event.parent_event_id,[]);
        }
        adjacencyList.get(event.parent_event_id).push(event.event_id);
    }


})
const findShortestPath=async(source,target)=>{
    const visited=new Set();
    const distances=new Map();
    const previous=new Map();
    const queue=[source];

    allEvents.forEach(event=>{
        distances.set(event.event_id,Infinity);
    });
    distances.set(source,eventMap.get(source).duration_minutes);

    while(queue.length>0){
        queue.sort((a,b)=>distances.get(a)-distances.get(b));
        const current=queue.shift();
        if(visited.has(current)) continue;

        visited.add(current);

        if(current===target) break;

    
        const neighbors=adjacencyList.get(current)||[];
        neighbors.forEach(neighbor=>{
            if(visited.has(neighbor)) return;

            const alt=distances.get(current)+eventMap.get(neighbor).duration_minutes;
            if(alt<distances.get(neighbor)){
                distances.set(neighbor,alt);
                previous.set(neighbor,current);
                queue.push(neighbor);
            }
        });
    }
    const path=[];
let current=target;
if(!previous.has(current) && current!==source) return null;
while(current){
    path.unshift(current);
    current=previous.get(current);

}

return path[0]==source?path:null;

}

const path=await findShortestPath(sourceEventId,targetEventId);
if(!path){
    return res.json({
        sourceEventId,
        targetEventId,
        message:'No connection between source and target event found',
      
    });
}
const shortestPath=path.map(eventId=>{
    const event=eventMap.get(eventId);
    return{
        event_id:event.event_id,
        event_name:event.event_name,
        duration:event.duration_minutes,

    }
})
const totalDurationMinutes=shortestPath.reduce((sum,event)=>sum+event.duration,0);
res.json({
    sourceEventId,
    targetEventId,
    shortestPath,
    totalDurationMinutes,
})
    }catch(err){
        console.error('Error fetching event influence:',err.message);
        res.status(500).json({error: err.message});
    }
}


export default {
  getOverlappingEvents,
  getTemporalGaps,
  getEventInfluence
};