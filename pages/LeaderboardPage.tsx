import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Response as QuizResponse, UserData, Question, Quiz } from "../types";
import { BlurReveal } from "../components/BlurReveal";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";

interface LeaderboardRow {
  userId: string;
  userData: UserData | null;
  correctCount: number;
  totalQuestions: number;
  totalTime: number;
  score: number;
}

const LeaderboardPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!quizId) return;
      try {
        // 1. Fetch Quiz Info
        const quizSnap = await getDoc(doc(db, "quizzes", quizId));
        if (quizSnap.exists()) {
          setQuiz({ id: quizSnap.id, ...quizSnap.data() } as Quiz);
        }

        // 2. Fetch Questions (to check correct answers)
        const qCol = collection(db, "quizzes", quizId, "questions");
        const qSnap = await getDocs(qCol);
        const questions = qSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Question,
        );
        const totalQuestions = questions.length;

        // 3. Fetch Responses
        const rQuery = query(
          collection(db, "responses"),
          where("quizId", "==", quizId),
        );
        const rSnap = await getDocs(rQuery);
        const responses = rSnap.docs.map((d) => d.data() as QuizResponse);

        // 4. Aggregate Data by User
        const uniqueUserIds = [...new Set(responses.map((r) => r.userId))];
        const rowsData: LeaderboardRow[] = [];

        await Promise.all(
          uniqueUserIds.map(async (uid) => {
            // Fetch User Details
            let user: UserData | null = null;
            const uSnap = await getDoc(doc(db, "users", uid));
            if (uSnap.exists()) {
              user = uSnap.data() as UserData;
            }

            // Calculate Stats
            const userResponses = responses.filter((r) => r.userId === uid);
            let correct = 0;
            let time = 0;
            let score = 0;

            userResponses.forEach((r) => {
              const q = questions[r.questionIndex];
              if (q) {
                time += r.timeTaken;
                if (r.selectedOption === q.correctIndex) {
                  correct++;
                  // Score calc (same as live leaderboard)
                  const bonus = Math.max(
                    0,
                    (1 - r.timeTaken / q.timeLimit) * 500,
                  );
                  score += 1000 + Math.floor(bonus);
                }
              }
            });

            rowsData.push({
              userId: uid,
              userData: user,
              correctCount: correct,
              totalQuestions: totalQuestions,
              totalTime: time,
              score: score,
            });
          }),
        );

        // 5. Sort (Correct DESC, Time ASC)
        rowsData.sort((a, b) => {
          if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
          return a.totalTime - b.totalTime;
        });

        setRows(rowsData);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quizId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <BlurReveal>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {quiz?.title || "Quiz"} Results
              </h1>
              <p className="text-zinc-500">Full Performance Report</p>
            </div>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </BlurReveal>

        <BlurReveal delay={0.1}>
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 uppercase text-xs font-semibold text-zinc-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-4 w-16">Sr No</th>
                    <th className="px-6 py-4">Profile</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4 text-center">Correct Answers</th>
                    <th className="px-6 py-4 text-center">Total Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-zinc-400"
                      >
                        No participants found for this quiz.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <motion.tr
                        key={row.userId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`hover:bg-zinc-50 transition-colors ${idx < 3 ? "bg-yellow-50/10" : ""}`}
                      >
                        <td className="px-6 py-4 font-mono text-zinc-400">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className="px-6 py-4">
                          {row.userData?.photoURL ? (
                            <img
                              src={row.userData.photoURL}
                              alt="Profile"
                              className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-bold">
                              {row.userData?.displayName?.[0] || "?"}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-zinc-900">
                          {row.userData?.displayName || "Anonymous"}
                          {idx === 0 && <span className="ml-2">👑</span>}
                        </td>
                        <td className="px-6 py-4 text-zinc-500">
                          {row.userData?.email || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {row.correctCount} / {row.totalQuestions}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono">
                          {row.totalTime.toFixed(2)}s
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </BlurReveal>
      </div>
    </div>
  );
};

export default LeaderboardPage;
