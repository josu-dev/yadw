import { z } from 'zod';
import { INTERACTION } from '../config.js';
import { validatedImport } from '../file.js';


const eventSchema = z.object({
    default: z
        .function()
        .returns(z.object({
            once: z.boolean(),
            name: z.string(),
            description: z.string(),
            response: z
                .function(
                    z.tuple([z.object({})]).rest(z.unknown()),
                    z.void()
                )
        }))
});


/**
 * @param {import('../client').Client} client
 * @returns {Promise<void>}
 */
export async function registerEvents(client) {
    const EVENTS_ABS_DIR = INTERACTION.EVENTS.PATH;

    const eventsToLoad = f.deepList({
        type: 'file',
        absolutePath: EVENTS_ABS_DIR,
        dirNamePattern: /^[^!+][\w-]+$/,
        fileNamePattern: /^[^!+][\w-]+\.(ts|js)$/,
    });
    if (!eventsToLoad || eventsToLoad.length === 0) {
        console.log('Failed to find events to register');
        // log.warning(`Failed to find events to register`);
        return;
    }

    for (const eventName of eventsToLoad) {
        console.log('eventName', EVENTS_ABS_DIR);
        const EVENT_ABS_PATH = new URL(eventName, EVENTS_ABS_DIR + '/');

        const importResult = await validatedImport(EVENT_ABS_PATH, eventSchema);
        if (!importResult.success) {
            console.error(`import error: ${importResult.error}\n  path > ${EVENT_ABS_PATH}\n  exception?.name > ${importResult.exception?.name}`);
            console.log(importResult.exception);
            // log.warn(`import error: ${importResult.error}\n  path > ${EVENT_ABS_PATH}\n  exception?.name > ${importResult.exception?.name}`);
            // log.warn(`Event declared at path '${EVENT_ABS_PATH}' has problems, not loaded`);
            continue;
        }

        const event = /** @type {import('./public.js').EventModule} */(importResult.module).default();

        if (event.once)
            client.once(event.name, (...args) => void event.response(client, ...args));
        else
            client.on(event.name, (...args) => void event.response(client, ...args));
    }
}
