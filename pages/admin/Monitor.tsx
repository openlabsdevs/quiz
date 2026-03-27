import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { useQuizControl } from "../../hooks/useQuizControl";
import { useQuizListener } from "../../hooks/useQuizListener";
import { BlurReveal } from "../../components/BlurReveal";
import { Button } from "../../components/ui/Button";
import { Leaderboard } from "../../components/Leaderboard";

const Monitor: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const {
    questions,
    loading: loadingControl,
    initializeSession,
    pushQuestion,
    revealFirstQuestion,
    revealOptions,
    revealAnswer,
    endQuiz,
  } = useQuizControl(quizId || "");

  const { session } = useQuizListener(quizId || "");
  const [responsesCount, setResponsesCount] = useState(0);

  useEffect(() => {
    if (
      !loadingControl &&
      questions.length > 0 &&
      (!session || session.status === "finished")
    ) {
      initializeSession();
    }
  }, [loadingControl, questions]);

  useEffect(() => {
    if (!quizId || !session) return;
    const q = query(
      collection(db, "responses"),
      where("quizId", "==", quizId),
      where("questionIndex", "==", session.currentQuestionIndex),
    );
    const unsub = onSnapshot(q, (snap) => setResponsesCount(snap.size));
    return () => unsub();
  }, [quizId, session?.currentQuestionIndex]);

  if (loadingControl || !session)
    return <div className="p-12 text-center">Loading Control Room...</div>;

  const currentQ = questions[session.currentQuestionIndex];
  const isLastQuestion = session.currentQuestionIndex >= questions.length - 1;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <div className="flex-1 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        {/* Top: Monitor Display */}
        <div className="flex-1 p-6 overflow-y-auto border-b border-zinc-200">
          <BlurReveal className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-end border-b border-zinc-200 pb-4">
              <div>
                <h1 className="text-xl font-bold">Control Room</h1>
                <p className="text-zinc-500 text-sm">ID: {quizId}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold">
                  {responsesCount}
                </div>
                <div className="text-xs uppercase tracking-widest text-zinc-400">
                  Responses
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8 flex flex-col items-center text-center space-y-6">
              <div className="text-xs font-mono uppercase bg-black text-white px-2 py-1 rounded">
                {session.status}
              </div>

              {currentQ?.imageUrl && (
                <img
                  src={currentQ.imageUrl}
                  className="h-40 object-contain rounded border border-zinc-100"
                  alt="Q"
                />
              )}

              <h2 className="text-2xl font-bold max-w-2xl">
                {currentQ?.text || session.currentQuestionText}
              </h2>

              {(session.status === "active" ||
                session.status === "revealed") && (
                <div className="grid grid-cols-2 gap-4 w-full max-w-lg text-left">
                  {currentQ?.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded border text-sm ${i === currentQ.correctIndex ? "border-green-500 bg-green-50 font-bold" : "border-zinc-100 bg-zinc-50 text-zinc-400"}`}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </BlurReveal>
        </div>

        {/* Bottom: Leaderboard */}
        {/* Bottom: Leaderboard */}
        <div className="h-1/3 min-h-[300px] bg-zinc-50 p-6 overflow-y-auto border-t border-zinc-200">
          <BlurReveal delay={0.2} className="max-w-4xl mx-auto">
            <Leaderboard quizId={quizId || ""} questions={questions} />
          </BlurReveal>
        </div>
      </div>

      {/* Control Deck */}
      <div className="bg-white border-t border-zinc-200 p-4 h-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex items-center">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="text-sm font-medium text-zinc-500">
            Q {session.currentQuestionIndex + 1} / {questions.length}
          </div>

          <div className="flex gap-4">
            {session.status === "waiting" &&
              session.currentQuestionIndex === 0 &&
              session.currentQuestionText === "Waiting for host..." && (
                <Button
                  onClick={revealFirstQuestion}
                  className="w-40 bg-zinc-800"
                >
                  Reveal Question
                </Button>
              )}

            {session.status === "waiting" &&
              !(
                session.currentQuestionIndex === 0 &&
                session.currentQuestionText === "Waiting for host..."
              ) && (
                <Button
                  onClick={() => revealOptions(session.currentQuestionIndex)}
                  className="w-40 bg-black"
                >
                  Start Timer
                </Button>
              )}

            {session.status === "active" && (
              <Button
                onClick={() => revealAnswer(session.currentQuestionIndex)}
                className="w-40 bg-zinc-800"
              >
                Reveal Answer
              </Button>
            )}

            {session.status === "revealed" &&
              (isLastQuestion ? (
                <Button
                  onClick={() => {
                    endQuiz();
                    navigate("/admin/dashboard");
                  }}
                  variant="destructive"
                >
                  End Quiz
                </Button>
              ) : (
                <Button
                  onClick={() => pushQuestion(session.currentQuestionIndex + 1)}
                  className="w-40"
                >
                  Next Question
                </Button>
              ))}

            {session.status === "finished" && (
              <Button
                onClick={() => navigate("/admin/dashboard")}
                variant="outline"
              >
                Back to Dash
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitor;
