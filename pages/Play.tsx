import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuizListener } from "../hooks/useQuizListener";
import { BlurReveal } from "../components/BlurReveal";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Leaderboard } from "../components/Leaderboard";
import { Question } from "../types";

const Play: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { session } = useQuizListener(quizId || "");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Fetch questions needed for leaderboard logic and timer
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!quizId) return;
      try {
        const qCol = collection(db, "quizzes", quizId, "questions");
        const snap = await getDocs(qCol);
        const loadedQuestions = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Question,
        );
        setQuestions(loadedQuestions);
      } catch (err) {
        console.error("Failed to load questions", err);
      }
    };
    fetchQuestions();
  }, [quizId]);

  // Timer Logic
  useEffect(() => {
    if (!session || !questions.length || session.status !== "active") {
      setTimeLeft(null);
      return;
    }

    const currentQ = questions[session.currentQuestionIndex];
    if (!currentQ) return;

    const limit = currentQ.timeLimit || 30;

    // Calculate start time
    const now = Date.now();
    const start = session.startTime
      ? typeof session.startTime === "number"
        ? session.startTime
        : session.startTime.toMillis()
      : now;

    const elapsed = (now - start) / 1000;
    const remaining = Math.max(0, limit - elapsed);

    setTimeLeft(Math.floor(remaining));

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - start) / 1000;
      const remaining = Math.max(0, limit - elapsed);
      setTimeLeft(Math.floor(remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [session, questions]);

  // Auto-submit on Time's Up
  useEffect(() => {
    if (timeLeft === 0 && !hasSubmitted && session?.status === "active") {
      if (selectedIdx !== null) {
        submitAnswer(selectedIdx);
      }
    }
  }, [timeLeft, hasSubmitted, selectedIdx, session?.status]);

  // Reset local state when question changes
  useEffect(() => {
    // Only reset if we move to a new question index (not just status change)
    if (session?.status === "waiting") {
      setHasSubmitted(false);
      setSelectedIdx(null);
    }
  }, [session?.currentQuestionIndex, session?.status]);

  // Anti-Cheat Mechanisms
  useEffect(() => {
    // Only enforce during active quiz stages
    if (!session || session.status === "finished") return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("Cheating detected: Copying text is prohibited. You have been ejected.");
      navigate("/dashboard");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Print Screen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        alert("Cheating detected: Screenshots are prohibited. You have been ejected.");
        navigate("/dashboard");
      }
      // Prevent Mac/Windows screenshot shortcuts (Cmd/Ctrl + Shift + 3/4/5/S)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "s", "S"].includes(e.key)) {
        e.preventDefault();
        alert("Cheating detected: Screenshots are prohibited. You have been ejected.");
        navigate("/dashboard");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert("Cheating detected: Switching tabs or minimizing the window is prohibited. You have been ejected.");
        navigate("/dashboard");
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [navigate, session?.status]);

  const handleSubmit = async () => {
    if (selectedIdx === null || hasSubmitted || !user || !quizId || !session)
      return;
    await submitAnswer(selectedIdx);
  };

  const submitAnswer = async (idx: number) => {
    setHasSubmitted(true);

    const now = Date.now();
    const start = session?.startTime
      ? typeof session.startTime === "number"
        ? session.startTime
        : session.startTime.toMillis()
      : now;
    const timeTaken = (now - start) / 1000;

    try {
      await addDoc(collection(db, "responses"), {
        quizId,
        questionIndex: session?.currentQuestionIndex,
        userId: user?.uid,
        selectedOption: idx,
        submittedAt: serverTimestamp(),
        timeTaken: timeTaken,
      });
    } catch (err) {
      console.error("Submission failed", err);
      setHasSubmitted(false);
    }
  };

  if (!session)
    return (
      <div className="h-screen flex items-center justify-center">
        Loading Quiz Engine...
      </div>
    );

  const isTimeUp = timeLeft === 0 && session.status === "active";

  if (session.status === "finished") {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <BlurReveal className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Quiz Finished</h1>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate(`/leaderboard/${quizId}`)}>
              View Full Leaderboard
            </Button>
          </div>
          <div className="mt-8 w-full max-w-md mx-auto">
            <Leaderboard quizId={quizId || ""} questions={questions} />
          </div>
        </BlurReveal>
      </div>
    );
  }

  // Determine option styling based on state
  const getOptionStyle = (idx: number) => {
    if (session.status === "revealed" && session.correctIndex !== undefined) {
      if (idx === session.correctIndex)
        return "bg-green-500 text-white border-green-600"; // Correct
      if (selectedIdx === idx && idx !== session.correctIndex)
        return "bg-red-500 text-white border-red-600"; // User Wrong
      return "opacity-50 border-zinc-200"; // Irrelevant
    }

    if (hasSubmitted || isTimeUp) {
      return selectedIdx === idx
        ? "bg-black text-white border-black"
        : "opacity-50 border-zinc-200";
    }

    if (selectedIdx === idx) {
      return "bg-zinc-100 border-black ring-1 ring-black";
    }

    return "bg-white text-black border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50";
  };

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-2xl mx-auto w-full relative select-none">
      <div className="flex-1 flex flex-col justify-center">
        <BlurReveal className="w-full space-y-8">
          {/* Status Bar */}
          <div className="flex justify-between items-center text-xs font-mono uppercase text-zinc-400 tracking-widest">
            <span>Q {session.currentQuestionIndex + 1}</span>
            <div className="flex items-center gap-4">
              <span>{session.status}</span>
              {session.status === "active" && timeLeft !== null && (
                <span
                  className={`text-lg font-bold ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-black"}`}
                >
                  {timeLeft}s
                </span>
              )}
            </div>
          </div>

          {/* Question Area */}
          <div className="space-y-6">
            {session.currentImageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-48 md:h-64 bg-zinc-100 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-200"
              >
                <img
                  src={session.currentImageUrl}
                  className="w-full h-full object-contain"
                  alt="Question Ref"
                />
              </motion.div>
            )}

            <div className="min-h-[80px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={session.currentQuestionText}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-2xl md:text-3xl font-bold text-center tracking-tight ${session.status === "waiting" ? "animate-pulse text-zinc-400" : "text-black"}`}
                >
                  {session.currentQuestionText}
                </motion.h2>
              </AnimatePresence>
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid gap-3">
            <AnimatePresence>
              {(session.status === "active" || session.status === "revealed") &&
                session.currentOptions?.map((option, idx) => (
                  <motion.button
                    key={`${session.currentQuestionIndex}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() =>
                      !hasSubmitted && !isTimeUp && setSelectedIdx(idx)
                    }
                    disabled={
                      hasSubmitted || session.status === "revealed" || isTimeUp
                    }
                    className={`
                    p-5 text-left border rounded-xl transition-all duration-300
                    ${getOptionStyle(idx)}
                  `}
                  >
                    <span className="mr-4 font-mono text-xs opacity-60">
                      0{idx + 1}
                    </span>
                    {option}
                  </motion.button>
                ))}
            </AnimatePresence>

            {/* Submit Button */}
            {session.status === "active" && !hasSubmitted && !isTimeUp && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4"
              >
                <Button
                  onClick={handleSubmit}
                  disabled={selectedIdx === null}
                  className="w-full h-12 text-lg font-bold"
                >
                  Submit Answer
                </Button>
              </motion.div>
            )}

            {isTimeUp && !hasSubmitted && (
              <div className="text-center text-red-500 font-bold py-4">
                Time's Up!
              </div>
            )}

            {session.status === "waiting" && (
              <div className="flex justify-center py-12">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
          </div>
        </BlurReveal>
      </div>

      {/* Leaderboard at Bottom */}
      {/* Leaderboard at Bottom - Only visible when revealed or finished */}
      {(session.status === "revealed" || session.status === "finished") && (
        <div className="mt-12 w-full pb-8">
          <Leaderboard
            quizId={quizId || ""}
            questions={questions}
            currentSession={session}
          />
        </div>
      )}
    </div>
  );
};

export default Play;
