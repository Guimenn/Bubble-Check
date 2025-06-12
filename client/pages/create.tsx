import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function CreateExam() {
  const router = useRouter();
  const [examName, setExamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [step, setStep] = useState(1);
  const [answerKey, setAnswerKey] = useState<{ [key: string]: string } | null>(null);

  const handleCreateExam = async () => {
    if (!examName) {
      setError('Por favor, insira um nome para o exame.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/create_exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ exam_name: examName }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setStep(2);
    } catch (err) {
      setError('Erro ao criar exame. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSolution = async () => {
    if (!solutionFile) {
      setError('Por favor, selecione o arquivo do gabarito.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('exam_name', examName);
      formData.append('file', solutionFile);

      const response = await fetch('http://localhost:8000/upload_solution', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setAnswerKey(data.answer_key);
      setStep(3);
    } catch (err) {
      setError('Erro ao fazer upload do gabarito. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAnswers = async () => {
    if (answerFiles.length === 0) {
      setError('Por favor, selecione pelo menos uma imagem de resposta.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('exam_name', examName);
      answerFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('http://localhost:8000/upload_multiple_images', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      router.push('/exams');
    } catch (err) {
      setError('Erro ao fazer upload das respostas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Criar Exame - Bubble Sheet Checker</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Criar Novo Exame</h1>

          {error && (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="exam-name" className="block text-sm font-medium text-gray-700">
                  Nome do Exame
                </label>
                <input
                  type="text"
                  id="exam-name"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Digite o nome do exame"
                />
              </div>
              <button
                onClick={handleCreateExam}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Exame'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload do Gabarito
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="solution-file"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Upload do gabarito</span>
                        <input
                          id="solution-file"
                          name="solution-file"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => setSolutionFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG até 10MB</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleUploadSolution}
                disabled={loading || !solutionFile}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Gabarito'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {answerKey && (
                <div className="bg-white shadow rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Gabarito Lido:</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(answerKey).map(([question, answer]) => (
                      <div key={question} className="bg-gray-50 p-2 rounded text-sm">
                        <span className="font-medium">{question}:</span> {answer}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload das Respostas
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="answer-files"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>Upload das respostas</span>
                        <input
                          id="answer-files"
                          name="answer-files"
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={(e) => setAnswerFiles(Array.from(e.target.files || []))}
                        />
                      </label>
                      <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG até 10MB</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleUploadAnswers}
                disabled={loading || answerFiles.length === 0}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar e Verificar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
