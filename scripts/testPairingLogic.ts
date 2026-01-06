import { pairSwiss, pairRoundRobin, pairKOTH, Participant } from '../services/pairingAlgorithms';

// Mock participants for testing
const mockParticipants: Participant[] = [
    { id: '1', user_id: 'A', wins: 3, spread: 200, status: 'active' },
    { id: '2', user_id: 'B', wins: 3, spread: 150, status: 'active' },
    { id: '3', user_id: 'C', wins: 2, spread: 100, status: 'active' },
    { id: '4', user_id: 'D', wins: 2, spread: 50, status: 'active' },
    { id: '5', user_id: 'E', wins: 1, spread: 0, status: 'active' },
    { id: '6', user_id: 'F', wins: 1, spread: -50, status: 'active' },
];

console.log('🎯 Tournament Pairing Logic Test Suite\n');

// Test 1: KOTH Pairing (Rank-based)
console.log('TEST 1: King of the Hill');
const kothPairings = pairKOTH(mockParticipants);
console.log('Pairings:', kothPairings);
// Expected: A vs B, C vs D, E vs F
const expected1 = kothPairings[0]?.player1_id === 'A' && kothPairings[0]?.player2_id === 'B';
console.log(expected1 ? '✅ PASS: Top 2 paired correctly\n' : '❌ FAIL: Top 2 not paired\n');

// Test 2: Round Robin (Berger Table)
console.log('TEST 2: Round Robin (6 players, Round 1)');
const roundRobin1 = pairRoundRobin(mockParticipants, 1);
console.log('Round 1 Pairings:', roundRobin1);
console.log(roundRobin1.length === 3 ? '✅ PASS: Generated 3 pairings\n' : '❌ FAIL: Wrong pairing count\n');

console.log('TEST 3: Round Robin (6 players, Round 2)');
const roundRobin2 = pairRoundRobin(mockParticipants, 2);
console.log('Round 2 Pairings:', roundRobin2);
// Verify no rematches between R1 and R2
const r1Matches = new Set(roundRobin1.filter(p => !p.is_bye).map(p => `${p.player1_id}-${p.player2_id}`));
const r2Matches = new Set(roundRobin2.filter(p => !p.is_bye).map(p => `${p.player1_id}-${p.player2_id}`));
const intersection = [...r1Matches].filter(x => r2Matches.has(x));
console.log(intersection.length === 0 ? '✅ PASS: No rematches in R2\n' : '❌ FAIL: Rematches found\n');

// Test 4: Swiss Pairing (No history)
console.log('TEST 4: Swiss Pairing (Round 1, no history)');
const emptyHistory = new Map<string, Set<string>>();
mockParticipants.forEach(p => emptyHistory.set(p.user_id, new Set()));
const swissPairings = pairSwiss(mockParticipants, emptyHistory, 1);
console.log('Swiss Pairings:', swissPairings);
console.log(swissPairings.length > 0 ? '✅ PASS: Generated pairings\n' : '❌ FAIL: No pairings generated\n');

// Test 5: Swiss with Rematch Avoidance
console.log('TEST 5: Swiss Pairing (Avoiding rematches)');
const historyWithRematch = new Map<string, Set<string>>();
mockParticipants.forEach(p => historyWithRematch.set(p.user_id, new Set()));
historyWithRematch.get('A')?.add('B');
historyWithRematch.get('B')?.add('A');

const swissPairings2 = pairSwiss(mockParticipants, historyWithRematch, 2);
console.log('Swiss R2 Pairings:', swissPairings2);
const hasRematch = swissPairings2.some(p =>
    (p.player1_id === 'A' && p.player2_id === 'B') ||
    (p.player1_id === 'B' && p.player2_id === 'A')
);
console.log(!hasRematch ? '✅ PASS: A vs B rematch avoided\n' : '❌ FAIL: A vs B rematch occurred\n');

// Test 6: Odd Number Handling (Bye)
console.log('TEST 6: Odd Player Count (Bye assignment)');
const oddPlayers = mockParticipants.slice(0, 5); // 5 players
const oddPairings = pairSwiss(oddPlayers, emptyHistory, 1);
const byePairings = oddPairings.filter(p => p.is_bye);
console.log('Bye Pairings:', byePairings);
console.log(byePairings.length === 1 ? '✅ PASS: Exactly 1 bye assigned\n' : '❌ FAIL: Incorrect bye assignment\n');

console.log('🏁 Test Suite Complete');
