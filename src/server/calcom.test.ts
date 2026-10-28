import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBooking, fetchSlots, INTRO_CALL_EVENT_TYPE_ID, type BookingRequest } from './calcom';

const RANGE = { from: new Date('2026-10-29T08:00:00Z'), to: new Date('2026-11-12T08:00:00Z') };

const booking: BookingRequest = {
  start: '2026-10-29T16:00:00.000Z',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  timeZone: 'Europe/London',
  language: 'en',
  company: 'Analytical Engines',
  reason: 'A senior .NET role in our platform team.',
};

function fetchReturning(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchSlots', () => {
  it('asks Cal.com for the Intro Call in Berlin time and returns sorted UTC starts', async () => {
    const fetcher = fetchReturning(
      Response.json({
        data: {
          '2026-10-30': [{ start: '2026-10-30T17:00:00.000+01:00' }],
          '2026-10-29': [
            { start: '2026-10-29T17:00:00.000+01:00' },
            { start: '2026-10-29T17:30:00.000+01:00' },
          ],
        },
      }),
    );

    const slots = await fetchSlots('cal_test', RANGE, fetcher);

    expect(slots).toEqual([
      '2026-10-29T16:00:00.000Z',
      '2026-10-29T16:30:00.000Z',
      '2026-10-30T16:00:00.000Z',
    ]);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    const query = new URL(String(url)).searchParams;
    expect(Object.fromEntries(query)).toEqual({
      eventTypeId: String(INTRO_CALL_EVENT_TYPE_ID),
      start: '2026-10-29',
      end: '2026-11-12',
      timeZone: 'Europe/Berlin',
    });
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer cal_test');
    expect(new Headers(init?.headers).get('cal-api-version')).toBe('2024-09-04');
  });

  it('throws when Cal.com fails or answers in an unknown shape', async () => {
    await expect(
      fetchSlots('cal_test', RANGE, fetchReturning(new Response('', { status: 500 }))),
    ).rejects.toThrow('500');
    await expect(
      fetchSlots('cal_test', RANGE, fetchReturning(Response.json({ slots: [] }))),
    ).rejects.toThrow();
  });
});

describe('createBooking', () => {
  it('books the Slot with the attendee and both required booking fields', async () => {
    const fetcher = fetchReturning(
      Response.json(
        { status: 'success', data: { uid: 'abc', status: 'pending' } },
        { status: 201 },
      ),
    );

    expect(await createBooking('cal_test', booking, fetcher)).toEqual({
      kind: 'requested',
      uid: 'abc',
    });

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://api.cal.com/v2/bookings');
    expect(new Headers(init?.headers).get('cal-api-version')).toBe('2024-08-13');
    expect(JSON.parse(String(init?.body))).toEqual({
      start: '2026-10-29T16:00:00.000Z',
      eventTypeId: INTRO_CALL_EVENT_TYPE_ID,
      attendee: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        timeZone: 'Europe/London',
        language: 'en',
      },
      bookingFieldsResponses: {
        company: 'Analytical Engines',
        reason: 'A senior .NET role in our platform team.',
      },
    });
  });

  it.each([400, 409, 422])('reports a refused booking (%i) instead of throwing', async (status) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetcher = fetchReturning(
      Response.json(
        { status: 'error', error: { code: 'no_available_users_found_error', details: booking } },
        { status },
      ),
    );

    expect(await createBooking('cal_test', booking, fetcher)).toEqual({ kind: 'refused', status });
    // Logs the error code only, never the attendee's details from the body.
    expect(error).toHaveBeenCalledWith(
      `Cal.com refused a booking (${status}):`,
      'no_available_users_found_error',
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain('ada@example.com');
  });

  it('throws on a rejected API key instead of calling the Slot taken', async () => {
    const fetcher = fetchReturning(Response.json({ error: 'unauthorized' }, { status: 401 }));

    await expect(createBooking('cal_test', booking, fetcher)).rejects.toThrow('401');
  });

  it('throws when Cal.com itself fails', async () => {
    const fetcher = fetchReturning(new Response('', { status: 503 }));

    await expect(createBooking('cal_test', booking, fetcher)).rejects.toThrow('503');
  });
});
