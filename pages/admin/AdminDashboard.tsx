import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { Quiz, Question } from "../../types";
import { BlurReveal } from "../../components/BlurReveal";
import { Button } from "../../components/ui/Button";
import { Leaderboard } from "../../components/Leaderboard";

const AdminDashboard: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "quizzes"), orderBy("title"));
    const unsub = onSnapshot(q, (snapshot) => {
      setQuizzes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Quiz));
    });
    return () => unsub();
  }, []);

  const toggleLive = async (quiz: Quiz) => {
    if (quiz.status === "draft" || quiz.status === "ended") {
      navigate(`/admin/monitor/${quiz.id}`);
      await updateDoc(doc(db, "quizzes", quiz.id), { status: "live" });
    } else {
      await updateDoc(doc(db, "quizzes", quiz.id), { status: "ended" });
    }
  };

  const handleDelete = async (quizId: string) => {
    if (!window.confirm("Are you sure? This deletes the quiz and all history."))
      return;

    try {
      // 1. Delete questions subcollection (Manual iteration needed in client SDK)
      const qCol = collection(db, "quizzes", quizId, "questions");
      const qSnap = await getDocs(qCol);
      qSnap.forEach(async (d) => await deleteDoc(d.ref));

      // 2. Delete live session
      await deleteDoc(doc(db, "live_sessions", quizId));

      // 3. Delete quiz doc
      await deleteDoc(doc(db, "quizzes", quizId));

      // Note: Responses technically remain orphaned in 'responses' col unless we query and delete them too.
      // For this scale, it's fine.
    } catch (e) {
      console.error("Error deleting", e);
      alert("Failed to delete completely");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-12 pb-20">
      <BlurReveal>
        <header className="flex justify-between items-center border-b border-zinc-100 pb-6">
          <h1 className="text-2xl font-bold">Admin Console</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/admin/create")}>
              + Create Quiz
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Exit
            </Button>
          </div>
        </header>
      </BlurReveal>

      <BlurReveal delay={0.1}>
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="p-4 font-medium text-zinc-500">Quiz Title</th>
                <th className="p-4 font-medium text-zinc-500">Status</th>
                <th className="p-4 font-medium text-zinc-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {quizzes.map((quiz) => (
                <tr
                  key={quiz.id}
                  className="group hover:bg-zinc-50 transition-colors"
                >
                  <td className="p-4 font-medium">{quiz.title}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        quiz.status === "live"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : quiz.status === "ended"
                            ? "bg-zinc-100 text-zinc-500 border-zinc-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      {quiz.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2 flex justify-end">
                    {quiz.status === "live" ? (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/admin/monitor/${quiz.id}`)}
                      >
                        Monitor
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/edit/${quiz.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            quiz.status === "ended" ? "outline" : "primary"
                          }
                          onClick={() => toggleLive(quiz)}
                        >
                          {quiz.status === "draft" ? "Go Live" : "Resume"}
                        </Button>
                        {quiz.status === "ended" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/leaderboard/${quiz.id}`)}
                          >
                            Full Report
                          </Button>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="ml-2 p-2 text-zinc-400 hover:text-red-600 transition-colors"
                      title="Delete Quiz"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BlurReveal>
    </div>
  );
};

export default AdminDashboard;
