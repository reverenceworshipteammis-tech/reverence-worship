import assert from "node:assert/strict";
import test from "node:test";
import {
  compactPlaylistSessions,
  groupPlaylistSessionsByService,
  movePlaylistSession,
  parsePlaylistServiceCount,
  parsePlaylistSessions,
  playlistServiceLabel,
} from "../src/lib/playlist-rules";

test("playlist session reordering uses the latest valid state", () => {
  const sessions = [
    { clientId: "first", serviceNumber: 1, name: "Opening" },
    undefined,
    { clientId: "second", serviceNumber: 1, name: "Before Sermon" },
    { clientId: "third", serviceNumber: 2, name: "Closing" },
  ];

  assert.deepEqual(compactPlaylistSessions(sessions).map((session) => session.clientId), ["first", "second", "third"]);
  assert.deepEqual(
    movePlaylistSession(sessions, 1, "second", -1).map((session) => session.clientId),
    ["second", "first", "third"],
  );
});

test("playlist service counts are limited to one through ten", () => {
  assert.equal(parsePlaylistServiceCount("1"), 1);
  assert.equal(parsePlaylistServiceCount(10), 10);
  assert.equal(parsePlaylistServiceCount(0), null);
  assert.equal(parsePlaylistServiceCount(11), null);
  assert.equal(parsePlaylistServiceCount("2.5"), null);
});

test("playlist sessions are grouped and ordered within their services", () => {
  const groups = groupPlaylistSessionsByService(2, [
    { name: "Before Sermon", serviceNumber: 1, displayOrder: 2 },
    { name: "Morning Praise", serviceNumber: 1, displayOrder: 1 },
    { name: "Closing", serviceNumber: 2, displayOrder: 1 },
  ]);

  assert.deepEqual(groups.map((group) => group.label), ["Service One", "Service Two"]);
  assert.deepEqual(groups[0].sessions.map((session) => session.name), ["Morning Praise", "Before Sermon"]);
  assert.deepEqual(groups[1].sessions.map((session) => session.name), ["Closing"]);
  assert.equal(playlistServiceLabel(10), "Service Ten");
});

test("playlist session input requires an ordered session for every service", () => {
  const valid = parsePlaylistSessions(JSON.stringify([
    { serviceNumber: 1, name: "Morning Praise", songIds: [3, 3, 2] },
    { serviceNumber: 1, name: "Before Sermon", songIds: [] },
    { serviceNumber: 2, name: "Morning Praise", songIds: [4] },
  ]), 2);

  assert.equal(valid.message, null);
  assert.deepEqual(valid.sessions, [
    { serviceNumber: 1, name: "Morning Praise", displayOrder: 1, songs: [{ songId: 3, keySignature: "", assignedSinger: "" }, { songId: 2, keySignature: "", assignedSinger: "" }] },
    { serviceNumber: 1, name: "Before Sermon", displayOrder: 2, songs: [] },
    { serviceNumber: 2, name: "Morning Praise", displayOrder: 1, songs: [{ songId: 4, keySignature: "", assignedSinger: "" }] },
  ]);

  const missingService = parsePlaylistSessions(JSON.stringify([
    { serviceNumber: 1, name: "Morning Praise", songIds: [] },
  ]), 2);
  assert.match(missingService.message ?? "", /Service Two/);

  const optionalHeading = parsePlaylistSessions(JSON.stringify([
    { serviceNumber: 1, name: "", songIds: [2] },
    { serviceNumber: 1, name: "", songIds: [3] },
  ]), 1);
  assert.equal(optionalHeading.message, null);
  assert.equal(optionalHeading.sessions?.[0].name, "");
  assert.equal(optionalHeading.sessions?.length, 2);

  const repeatedHeading = parsePlaylistSessions(JSON.stringify([
    { serviceNumber: 1, name: "Morning Praise", songIds: [2] },
    { serviceNumber: 1, name: "Morning Praise", songIds: [3] },
  ]), 1);
  assert.equal(repeatedHeading.message, null);
  assert.equal(repeatedHeading.sessions?.length, 2);
});

test("playlist song performance details belong to each session assignment", () => {
  const parsed = parsePlaylistSessions(JSON.stringify([
    {
      serviceNumber: 1,
      name: "Morning Praise",
      songAssignments: [{ songId: 7, keySignature: "G", assignedSinger: "Alice" }],
    },
    {
      serviceNumber: 2,
      name: "Morning Praise",
      songAssignments: [{ songId: 7, keySignature: "A", assignedSinger: "Beatrice" }],
    },
  ]), 2);

  assert.equal(parsed.message, null);
  assert.deepEqual(parsed.sessions?.map((session) => session.songs[0]), [
    { songId: 7, keySignature: "G", assignedSinger: "Alice" },
    { songId: 7, keySignature: "A", assignedSinger: "Beatrice" },
  ]);
});
