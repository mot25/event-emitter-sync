/* Check the comments first */

import { EventEmitter } from "./emitter";
import { EventDelayedRepository } from "./event-repository";
import { EventStatistics } from "./event-statistics";
import { ResultsTester } from "./results-tester";
import { triggerRandomly } from "./utils";

const MAX_EVENTS = 1000;

enum EventName {
  EventA = "A",
  EventB = "B",
}

const EVENT_NAMES = [EventName.EventA, EventName.EventB];

/*

  An initial configuration for this case

*/

function init() {
  const emitter = new EventEmitter<EventName>();

  triggerRandomly(() => emitter.emit(EventName.EventA), MAX_EVENTS);
  triggerRandomly(() => emitter.emit(EventName.EventB), MAX_EVENTS);

  const repository = new EventRepository();
  const handler = new EventHandler(emitter, repository);

  const resultsTester = new ResultsTester({
    eventNames: EVENT_NAMES,
    emitter,
    handler,
    repository,
  });
  resultsTester.showStats(20);
}

/* Please do not change the code above this line */
/* ----–––––––––––––––––––––––––––––––––––––---- */

/*

  The implementation of EventHandler and EventRepository is up to you.
  Main idea is to subscribe to EventEmitter, save it in local stats
  along with syncing with EventRepository.

  The implementation of EventHandler and EventRepository is flexible and left to your discretion.
  The primary objective is to subscribe to EventEmitter, record the events in `.eventStats`,
  and ensure synchronization with EventRepository.

  The ultimate aim is to have the `.eventStats` of EventHandler and EventRepository
  have the same values (and equal to the actual events fired by the emitter) by the
  time MAX_EVENTS have been fired.

*/
class EventHandler extends EventStatistics<EventName> {
  repository: EventRepository;
  private eventQueue: EventName[] = [];
  private processing: boolean = false;
  private eventCounts: Map<EventName, number> = new Map();

  constructor(emitter: EventEmitter<EventName>, repository: EventRepository) {
    super();
    this.repository = repository;

    EVENT_NAMES.forEach((eventName) => {
      emitter.subscribe(eventName, () => {
        this.setStats(eventName, this.getStats(eventName) + 1);
        this.enqueueEvent(eventName);
        this.incrementEventCount(eventName);
        this.processQueue();
      });
    });
  }

  private enqueueEvent(eventName: EventName) {
    this.eventQueue.push(eventName);
  }

  private incrementEventCount(eventName: EventName) {
    this.eventCounts.set(eventName, (this.eventCounts.get(eventName) || 0) + 1);
  }

  private async processQueue() {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.eventQueue.length > 0) {
      const eventName = this.eventQueue.shift();

      if (eventName !== undefined) {
        try {
          await this.repository.saveEventData(eventName, this.eventCounts.get(eventName) || 0);
          this.eventCounts.set(eventName, 0);
        } catch (e) {
          console.error(`Error saving event data for ${eventName}:`, e);
          this.enqueueEvent(eventName);
        }
      }
    }

    this.processing = false;
  }
}

class EventRepository extends EventDelayedRepository<EventName> {
  async saveEventData(eventName: EventName, _: number): Promise<number > {
    try {
      this.setStats(
        eventName,
        (this.getStats(eventName) || 0) + 1
      );
      await this.updateEventStatsBy(eventName, 1);
      return this.getStats(eventName) ?? 0
    } catch (e) {
      return  0
    }
  }
}

init()
