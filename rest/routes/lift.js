import express from 'express';
import { getLatestBatch, getNearestBatch } from '../../utils/mongodb.js';
import { cacheResult, updateKey } from '../../utils/redis.js';
import { BatchType } from '../../models/Enum.js';
import { ObjectType } from '../../models/Enum.js';
import { fetchFromCache } from '../../utils/redis.js';
import { LiftStatus } from '../../models/Enum.js';

const router = express.Router();

// Unless otherwise noted, you must implement a caching layer for each endpoint
// except for the write. With clever coding this is rather painless.
// IMPORTANT: You MUST have console.log statements to show that the
// architecture is being used:
// 1. "Attempting to fetch data from cache"
// 2. "Data found / not found in cache"
// 3. "Fetching data from MongoDB"
// 4. "Writing data to cache"
// All inserts into the cache MUST have a TTL of only 5 minutes.

const fetch_from_cache = async (key) => {
  console.log(`Attempting to fetch data from cache`);
  const data_cached = await fetchFromCache(key);

  if (data_cached) {
    console.log('Data found in cache');
    return data_cached; // Return the parsed data from cache
  } 
    console.log('Data not found in cache');
    return null; // Return null if no data is found in cache
  
};

router.get('/latest', async (req, res) => {
  try {
    // TODO: First, implement getting the latest lift batch from MongoDB
    // Return an array with the lift name and its data.
  
     const cachedData = await fetch_from_cache('lifts-latest');
    if (cachedData) {
      return res.json(cachedData);
    } else {
      console.log('Fetching data from MongoDB');

    const latestBatch = await getLatestBatch(BatchType.LiftBatch);
    if (!latestBatch){  await cacheResult('lifts-latest', [], 300); return res.json ([]);}
    console.log('Writing data to cache');

    await cacheResult('lifts-latest', latestBatch.lifts, 300);
    return res.json(latestBatch.lifts);
    }
  } catch (error) {
    console.error("Error in /latest route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/latest/open', async (req, res) => {
  try {
      const cached_open = await fetch_from_cache('lifts-open');
       if (cached_open) {
      console.log('Cached open data');
      return res.json(cached_open);
       } 
       console.log('Fetching data from MongoDB');

    const latestBatch = await getLatestBatch(BatchType.LiftBatch);
    const open = latestBatch.lifts.filter(lift => lift.status === "OPEN");
    console.log('Writing data to cache');

    if (!open){await cacheResult('lifts-open', [], 300); return res.json([]);  }

     await cacheResult('lifts-open', open, 300);

    return res.json(open);  
  } catch (error) {
    console.error("Error in /latest/open route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/latest/:name', async (req, res) => {
  try {
    // TODO: Implement getting a specific lift by name.
    // If the proper parameters are not passed, return the proper HTTP code with message.
    // If the lift does not exist, return empty.
    // Note that there are a couple of ways to do this.
    // You should return a JSON object with the lift name and its data.
    //code 400 for parameter, 500 for server error


    const latestBatch = await getLatestBatch(BatchType.LiftBatch);
    const name = req.params.name;
    if (!name){
      return res.status(400).json({ error: "Wrong paramter name passed" });
    }
        const key = `lift_${name}`;
    const cached_open_name = await fetch_from_cache(key);
       if (cached_open_name) {
      console.log('cached open data with name retrieved');
      return res.json(cached_open_name);
       } 
console.log('Fetching data from MongoDB');

    const liftWithNameBool = latestBatch.lifts.some(lift => lift.name === name); //exists is not proper java so used some
    if (liftWithNameBool) {
      const liftWithName = latestBatch.lifts.filter(lift => lift.name === name);
      console.log('Writing data to cache');

      await cacheResult(key, liftWithName[0], 300);
      return (res.json(liftWithName[0] ));
    }
    else{
      console.log('Writing data to cache');

        await cacheResult(key, {}, 300);
      return res.json ({});
    }
  

  } catch (error) {
    console.error("Error in /latest/:name route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/latest/:name/:field', async (req, res) => {
  try {
    // TODO: Implement getting a specific field of a lift
    // If the proper parameters are not passed, return the proper HTTP code with message.
    // If the lift does not exist, return empty.
    // If the field does not exist, return empty.
    // Return a JSON object with the trail name and the requested field.

    const latestBatch = await getLatestBatch(BatchType.LiftBatch);
    const name = req.params.name;
    const field = req.params.field;
    if (!name ||!field){
      return res.status(400).json({ error: "Wrong paramter name passed" });
    }


     const key = `lift_${name}_${field}`;
    const cached_open_name_f = await fetch_from_cache(key);
       if (cached_open_name_f) {
      console.log('cached open data with name and field retrieved');
      return res.json(cached_open_name_f);
       } 
console.log('Fetching data from MongoDB');
    const liftWithNameField = latestBatch.lifts.find(lift => lift.name === name );
    if (liftWithNameField && liftWithNameField[field] !== undefined) {
      console.log('Writing data to cache');
      await cacheResult(key, { name, [field]: liftWithNameField[field] }, 300);
      return (res.json({ name, [field]: liftWithNameField[field] }));
    }
  
    else{
      console.log('Writing data to cache');
       await cacheResult(key, {}, 300);
      return res.json ({});
    }
  

  } catch (error) {
    console.error("Error in /latest/:name route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/at/:timestamp', async (req, res) => {
  try {
    // TODO: Implement getting the most recent lift batch before a certain time. What this means is the following:
    // If you query for a batch at 11am, and all that exists is a batch for 9am (before 11am) fetch the 9am.
    // If the proper parameters are not passed, return the proper HTTP code with message.
    // If the timestamp is not of the correct format, return the proper HTTP code with message.
    // Return an array of JSON objects with the lift name and its data.
    // YOU DO NOT NEED TO IMPLEMENT CACHING HERE


    const ts = req.params.timestamp;
    if(!ts || isNaN(Date.parse(ts))){
       return res.status(400).json({ error: "Wrong paramters passed" }); 
      }
    const nearestBatch = await getNearestBatch(BatchType.LiftBatch, ts);
   
    if (!nearestBatch){return res.json ([]);} else{
    return res.json(nearestBatch.lifts);
    }
   
  } catch (error) {
    console.error("Error in /at/:timestamp route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch('/update', async (req, res) => {
  try {
       const {name, status}  = req.body;
    if (!status || !name) {
      return res.status(400).json({ error: "missing name or status" });
    }
     const key = `lifts-latest`;
    console.log("Attempting to fetch data from cache");
    const batch = await fetch_from_cache(key);
    if (!batch ) {
      console.log("Data not found in cache");
      return res.status(404).json({ error: "Lift batch not in cache" });
    }
    const i = batch.findIndex(lift => lift.name === name);
    if (i === -1) {
      return res.status(404).json({ error: "Lift not found in batch" });
    }
    const lift = batch[i];
    lift.status = status;
    lift.lastUpdated = new Date().toISOString();
    
  console.log('Writing data to cache');
    console.log("Writing updated lift to caches");
    await cacheResult(key, batch, 300);

     await cacheResult(`lift_${name}_status`, { name, status }, 300);
      const key1 = `lift-open`;

    

      const cached_open = await fetch_from_cache('lifts-open');
       if (cached_open && lift.status!=='OPEN') { //if status is not open, and if the list is in lifts-open, we need to remove it
     let updatedOpen = cached_open.filter(l => l.name !== name);
     if (updatedOpen) { await cacheResult('lifts-open', updatedOpen, 300)};

       } else if (status === 'OPEN') {
  if (!cached_open) {
    await cacheResult('lifts-open', [lift], 300);
  } else {
      const alreadyOpen = cached_open.some(l => l.name === name);
      if (!alreadyOpen){
      cached_open.push(lift);

      await cacheResult('lifts-open', cached_open, 300);}
  
  }}


   return res.json(lift);
  } catch (error) {
    console.error("Error in PATCH /update/:name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


export default router;
