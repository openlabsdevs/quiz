import { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Question } from "../types";

export const useQuizControl = (quizId: string) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const qCol = collection(db, "quizzes", quizId, "questions");
        const snap = await getDocs(qCol);
        const loadedQuestions = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Question,
        );
        setQuestions(loadedQuestions);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load questions", err);
        setLoading(false);
      }
    };
    loadQuestions();
  }, [quizId]);

  const liveSessionRef = doc(db, "live_sessions", quizId);

  const initializeSession = async () => {
    if (questions.length === 0) return;

    await setDoc(
      liveSessionRef,
      {
        status: "waiting",
        currentQuestionIndex: 0,
        currentQuestionText: "Waiting for host...",
        currentImageUrl: null,
        totalQuestions: questions.length,
      },
      { merge: true },
    );
  };

  const pushQuestion = async (index: number) => {
    if (index >= questions.length) return;
    const q = questions[index];

    await updateDoc(liveSessionRef, {
      status: "waiting",
      currentQuestionIndex: index,
      currentQuestionText: q.text,
      currentImageUrl: q.imageUrl || null, // Reset or set image
      currentOptions: [],
      correctIndex: null, // Clear previous answer
    });
  };

  const revealFirstQuestion = async () => {
    if (questions.length === 0) return;
    const firstQ = questions[0];

    await updateDoc(liveSessionRef, {
      currentQuestionText: firstQ.text,
      currentImageUrl: firstQ.imageUrl || null,
    });
  };

  const revealOptions = async (index: number) => {
    if (index >= questions.length) return;
    const q = questions[index];

    await updateDoc(liveSessionRef, {
      status: "active",
      currentQuestionText: q.text,
      currentImageUrl: q.imageUrl || null,
      currentOptions: q.options,
      startTime: Date.now(), // Use generic timestamp number for easier client math
    });
  };

  // New: Show the correct answer and trigger leaderboard view
  const revealAnswer = async (index: number) => {
    if (index >= questions.length) return;
    const q = questions[index];

    await updateDoc(liveSessionRef, {
      status: "revealed",
      correctIndex: q.correctIndex,
    });
  };

  const endQuiz = async () => {
    await updateDoc(liveSessionRef, {
      status: "finished",
      currentQuestionText: "Quiz Ended. Thanks for playing.",
      currentOptions: [],
    });

    await updateDoc(doc(db, "quizzes", quizId), {
      status: "ended",
    });
  };

  return {
    questions,
    loading,
    initializeSession,
    pushQuestion,
    revealFirstQuestion,
    revealOptions,
    revealAnswer,
    endQuiz,
  };
};
