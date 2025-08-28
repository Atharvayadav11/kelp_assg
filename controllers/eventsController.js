import fs from 'fs/promises';
import {v4 as uuidv4} from 'uuid';
import db from '../config/db.js';
import * as DBModel from '../model/DBModel.js';

const calculateDuration=(startDate,endDate)=>{
    return Math.round((new Date(endDate)-new Date(startDate))/60000);
}

const formatDateForMySQL = (isoDateString) => {
    if (!isoDateString || isoDateString === 'NULL') return null;
    
    try {
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
        }
      
        return date.toISOString().slice(0, 19).replace('T', ' ');
    } catch (error) {
        throw new Error(`Invalid date format: ${isoDateString}`);
    }
}

const ingestEvents=async(req,res)=>{
    try{
        const {filePath}= req.body;
        const jobId=`ingest-job-${uuidv4()}`;

        await DBModel.createJob(jobId);

        res.status(202).json({
            status:'Ingestion Initialised',
            jobId:jobId,
        })

        processFile(filePath,jobId);

    }catch(err){
        console.error('Error during file ingestion:',err.message);
        res.status(500).json({error: err.message});
    }
    }

const processFile=async (filePath,jobId)=>{
    try{
        const data=await fs.readFile(filePath,'utf8');
        const lines=data.trim().split('\n');
        const errors=[];
        let processedLines=0;
        let errorLines=0;

        await DBModel.updateJob(jobId,{total_lines:lines.length});

        const validEvents = [];
        const parentEvents = [];
        const childEvents = [];

        for(let i=0;i<lines.length;i++){
            const line=lines[i].trim();
            if(!line){continue;}

            try{
                const parts=line.split('|');
               if(parts.length<6){
                errorLines++;
                errors.push(`Line ${i+1}: Insufficient number of fields`);
                continue;
               }
                const [eventId,event_name,startDate,endDate,parentId,researchValue, ...description]=parts;
    
                if(eventId === 'event_id' || startDate === 'startDate' || endDate === 'endDate'){
                    continue;
                }

                if(!eventId || eventId.trim() === ''){
                    errorLines++;
                    errors.push(`Line ${i+1}: Empty event ID`);
                    continue;
                }

                const formattedStartDate = formatDateForMySQL(startDate);
                const formattedEndDate = formatDateForMySQL(endDate);
                
                const event={
                    lineNumber: i+1,
                    event_id:eventId.trim(),
                    event_name:event_name,
                    start_date:formattedStartDate,
                    end_date:formattedEndDate,
                    duration_minutes:calculateDuration(startDate,endDate),
                    parent_event_id:parentId==='NULL' || !parentId.trim() ? null:parentId.trim(),
                    research_value:parseInt(researchValue)||null,
                    description:description.join('|') || null,
                }

     
                if(event.parent_event_id === null){
                    parentEvents.push(event);
                } else {
                    childEvents.push(event);
                }

                validEvents.push(event);

            }catch(err){
                errorLines++;
                errors.push(`Line ${i+1}: Processing error - ${err.message}`);
            }
        }

        for(const event of parentEvents){
            try{
                await DBModel.insertEvent(event);
                processedLines++;
            }catch(err){
                errorLines++;
                errors.push(`Line ${event.lineNumber}: Processing error - ${err.message}`);
            }
        }

        for(const event of childEvents){
            try{
                await DBModel.insertEvent(event);
                processedLines++;
            }catch(err){
                errorLines++;
                errors.push(`Line ${event.lineNumber}: Processing error - ${err.message}`);
            }
        }

        await DBModel.updateJob(jobId,{
            status:'Completed',
            processed_lines:processedLines,
            error_lines:errorLines,
            errors:errors,
            end_time:new Date(),
        });

    }catch(err){
        console.error('Error processing file:',err.message);
    }
}

const getIngestionStatus=async(req,res)=>{
    try{
        const {jobId}=req.params;
        const job=await DBModel.getJob(jobId);

        if(!job){
            return res.status(404).json({error:'Job not found'});
        }

        let parsedErrors = [];
        if (job.errors) {
            try {
                parsedErrors = JSON.parse(job.errors);
            } catch (jsonError) {
                console.error('Error parsing job errors JSON:', jsonError.message);
                parsedErrors = [job.errors];
            }
        }

        const response={
            jobId:job.job_id,
            status:job.status,
            processed_lines:job.processed_lines,
            error_lines:job.error_lines,
            total_lines:job.total_lines,
            errors:parsedErrors,
    }
    if(job.status==='Completed'&&job.end_time){
        response.startTime=job.start_time;
        response.endTime=job.end_time;
    }
res.json(response);
    }catch(err){
        console.error('Error fetching job status:',err.message);
        res.status(500).json({error: err.message});
    }
}

const getTimeline=async(req,res)=>{
    try{
        const {rootEventId}=req.params;

        const buildEventsTree=async(eventId)=>{

        const event=await DBModel.getEventById(eventId);
        if(!event){
            return null;

        }

        const children=await DBModel.getEventsByParentId(eventId);
        const childData=await Promise.all(children.map(child=>buildEventsTree(child.event_id)));

        return{
            event_id:event.event_id,
            event_name:event.event_name,
            start_date:event.start_date,
            duration:event.duration,
            parent_event_id:event.parent_event_id,
            children:childData.filter(child=>child!==null),
        }
    }
    const timeline=await buildEventsTree(rootEventId);
    if(!timeline){
        return res.status(404).json({error:'Event not found'});

}
res.json(timeline);
}catch(err){
    console.error('Error fetching timeline:',err.message);
    res.status(500).json({error: err.message});
    }
}

const searchEvents = async (req, res) => {
    try {
      const {
        name,
        start_date_after,
        end_date_before,
        page = 1,
        limit = 10
      } = req.query;
  
      const filters = {};
      if (name) filters.name = name;
      if (start_date_after){ filters.start_date_after = start_date_after;}
      if (end_date_before){ filters.end_date_before = end_date_before;}
  
      const offset = (parseInt(page) - 1) * parseInt(limit);
  
      const [events, totalCount] = await Promise.all([
        DBModel.searchEvents(filters, parseInt(limit), offset), 
        DBModel.countEvents(filters)
      ]);
  
      res.json({
        totalEvents: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        events: events.map(event => ({
          event_id: event.event_id,
          event_name: event.event_name
        }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

export default {
    ingestEvents,
    getIngestionStatus,
    getTimeline,
    searchEvents
};
