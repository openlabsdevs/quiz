import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Response as QuizResponse,
  UserData,
  Question,
  LiveSession,
} from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardProps {
  quizId: string;
  questions: Question[];
  currentSession?: LiveSession | null;
  isAdminView?: boolean;
}

interface UserScore {
  userId: string;
  displayName: string;
  totalScore: number;
  totalTime: number;
  correctCount: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  quizId,
  questions,
  currentSession,
  isAdminView,
}) => {
  const [scores, setScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDisqualify = async (uid: string) => {
    if (!window.confirm("Are you sure you want to disqualify this player?")) return;
    try {
      await updateDoc(doc(db, "live_sessions", quizId), {
        disqualifiedUsers: arrayUnion(uid)
      });
    } catch (e) {
      console.error("Failed to disqualify", e);
    }
  };

  useEffect(() => {
    if (!quizId) return;

    // Realtime listener for responses
    const respQuery = query(
      collection(db, "responses"),
      where("quizId", "==", quizId),
    );

    const unsubscribe = onSnapshot(respQuery, async (snapshot) => {
      try {
        const responses = snapshot.docs.map((d) => d.data() as QuizResponse);

        // Fetch users (simple cache Map)
        const uniqueUserIds = [...new Set(responses.map((r) => r.userId))];
        const userMap: Record<string, string> = {};

        // In a real app, you'd want a more robust caching strategy or backend aggregation
        await Promise.all(
          uniqueUserIds.map(async (uid) => {
            // Check if we already have it in state? (Simplify for now: fetch every update or rely on browser cache)
            // Ideally firestore caches this efficiently.
            const uSnap = await getDoc(doc(db, "users", uid));
            const uData = uSnap.data() as UserData | undefined;
            userMap[uid] = uData?.displayName || "Anonymous";
          }),
        );

        const calculatedScores: Record<string, UserScore> = {};

        responses.forEach((resp) => {
          // Logic to hide scores for the TOP/Current question until revealed
          if (currentSession) {
            // If response is for a future question (shouldn't happen) or current question
            if (resp.questionIndex > currentSession.currentQuestionIndex)
              return;

            if (resp.questionIndex === currentSession.currentQuestionIndex) {
              // Only show if revealed or finished
              if (
                currentSession.status !== "revealed" &&
                currentSession.status !== "finished"
              ) {
                // Ensure we at least initialize the user entry so they appear on the list (with 0 pts added for this round)
                if (!calculatedScores[resp.userId]) {
                  calculatedScores[resp.userId] = {
                    userId: resp.userId,
                    displayName: userMap[resp.userId] || "Unknown",
                    totalScore: 0,
                    totalTime: 0,
                    correctCount: 0,
                  };
                }
                return;
              }
            }
          }

          const question = questions[resp.questionIndex];
          if (!question) return;

          const isCorrect = resp.selectedOption === question.correctIndex;
          let points = 0;
          if (isCorrect) {
            const bonus = Math.max(
              0,
              (1 - resp.timeTaken / question.timeLimit) * 500,
            );
            points = 1000 + Math.floor(bonus);
          }

          if (!calculatedScores[resp.userId]) {
            calculatedScores[resp.userId] = {
              userId: resp.userId,
              displayName: userMap[resp.userId] || "Unknown",
              totalScore: 0,
              totalTime: 0,
              correctCount: 0,
            };
          }

          calculatedScores[resp.userId].totalScore += points;
          calculatedScores[resp.userId].totalTime += resp.timeTaken;
          if (isCorrect) {
            calculatedScores[resp.userId].correctCount += 1;
          }
        });

        const sorted = Object.values(calculatedScores).sort((a, b) => {
          if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
          return a.totalTime - b.totalTime;
        });

        setScores(sorted);
        setLoading(false);
      } catch (err) {
        console.error("Error updating leaderboard", err);
      }
    });

    return () => unsubscribe();
  }, [
    quizId,
    questions,
    currentSession?.status,
    currentSession?.currentQuestionIndex,
  ]);

  return (
    <div className="w-full bg-white/80 backdrop-blur-md border border-zinc-200/50 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-widest uppercase">
            Live Standings
          </h3>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-mono opacity-60">LIVE</span>
          </div>
        </div>
      </div>

      <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
        {loading && scores.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs animate-pulse">
            Syncing data...
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 font-medium uppercase sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3 w-16">Rank</th>
                <th className="px-5 py-3">Player</th>
                <th className="px-5 py-3 text-center">Correct</th>
                <th className="px-5 py-3 text-center">Time</th>
                <th className="px-5 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              <AnimatePresence>
                {scores.map((s, idx) => (
                  <motion.tr
                    key={s.userId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`group ${idx < 3 ? "bg-gradient-to-r from-yellow-50/30 to-transparent" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div
                        className={`
                                w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold font-mono
                                ${
                                  idx === 0
                                    ? "bg-yellow-400 text-yellow-900 ring-2 ring-yellow-200"
                                    : idx === 1
                                      ? "bg-zinc-300 text-zinc-800"
                                      : idx === 2
                                        ? "bg-orange-200 text-orange-900"
                                        : "bg-zinc-100 text-zinc-500"
                                }
                            `}
                      >
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-zinc-700 group-hover:text-black transition-colors">
                      {s.displayName}
                      {idx === 0 && <span className="ml-2 text-xs">👑</span>}
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-xs text-zinc-500">
                      {s.correctCount}
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-xs text-zinc-500">
                      {s.totalTime.toFixed(1)}s
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-zinc-900 whitespace-nowrap">
                      {s.totalScore.toLocaleString()}
                      {isAdminView && (
                        <button 
                          onClick={() => handleDisqualify(s.userId)} 
                          className="ml-4 px-2 py-1 text-[10px] bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Disqualify
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}

        {!loading && scores.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
            <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl">🏆</span>
            </div>
            <p className="text-xs font-medium">No scores yet</p>
            <p className="text-[10px] opacity-60">Be the first to answer!</p>
          </div>
        )}
      </div>
    </div>
  );
};
