import { Request, Response } from 'express'

import db from '../database/connection';
import converHourToMinutes from '../utils/convertHourToMinutes';

interface ScheduleItem {
  week_day: number,
  from: string,
  to: string
}

export default class ClassesController {
  async index(request: Request, response: Response) {
    const filters = request.query;

    if(!filters.week_day || !filters.subject || !filters.time) {
      return response.status(400).json({
        error: "Missing filters"
      })
    }

    const subject = filters.subject as string;
    const week_day = filters.week_day as string;
    const time = filters.time as string;

    const timeInMinutes = converHourToMinutes(time);

    const classes = await db('classes')
      .whereExists(function(){
        this.select('class_schedule.*')
          .from('class_schedule')
          .whereRaw('`class_schedule`.`class_id` = `classes`.`id`')
          .whereRaw('`class_schedule`.`week_day` = ??', [Number(week_day)])
          .whereRaw('`class_schedule`.`from` <= ??', [timeInMinutes])
          .whereRaw('`class_schedule`.`to` > ??', [timeInMinutes])
      })
      .where('classes.subject', '=', subject)
      .join('users','classes.user_id', '=', 'users.id');

    return response.json(classes);
  }

  async create(request: Request, response: Response) {
    const {
      name,
      avatar,
      whatsapp,
      bio,
      subject,
      cost,
      schedule
    } = request.body;
  
    const trx = await db.transaction();
  
    try {
      const user_ids = await trx('users').insert({
        name,
        avatar,
        whatsapp,
        bio
      });
  
      const class_ids = await trx('classes').insert({
        subject,
        cost,
        user_id: user_ids[0]
      })
  
      const class_schedule = schedule.map((item : ScheduleItem) => {
        return {
          week_day: item.week_day,
          from: converHourToMinutes(item.from),
          to: converHourToMinutes(item.to),
          class_id: class_ids[0]
        }
      })
  
      await trx("class_schedule").insert(class_schedule);
  
      await trx.commit();
  
      return response.status(201).send();
    }
    catch (error) {
      trx.rollback();
      return response.status(400).json({error});
    }
  }
} 