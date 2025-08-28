import express from 'express';
import eventsController from './controllers/eventsController.js';
import insightsController from './controllers/insightsController.js';

const router = express.Router();


router.post('/events/ingest', eventsController.ingestEvents);
router.get('/events/ingestion-status/:jobId', eventsController.getIngestionStatus);
router.get('/timeline/:rootEventId', eventsController.getTimeline);
router.get('/events/search', eventsController.searchEvents);

router.get('/insights/overlapping-events', insightsController.getOverlappingEvents);
router.get('/insights/temporal-gaps', insightsController.getTemporalGaps);
router.get('/insights/event-influence', insightsController.getEventInfluence);

export default router;