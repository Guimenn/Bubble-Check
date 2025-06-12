import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Exam {
  name: string;
  processed: boolean;
  report?: {
    [key: string]: {
      score: number;
      choices: { [key: string]: string };
      correct_answers: { [key: string]: string };
    };
  };
}

export default function Exams() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await fetch('http://localhost:8000/get_exams');
      const data = await response.json();
      setExams(data.exams.map((name: string) => ({ name, processed: false })));
    } catch (err) {
      setError('Erro ao carregar exames. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAnswerFiles(Array.from(e.target.files));
    }
  };

  const handleUploadAnswers = async (examName: string) => {
    if (answerFiles.length === 0) {
      setError('Por favor, selecione pelo menos uma imagem de resposta.');
      return;
    }

    setUploading(true);
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

      // Após o upload, gerar o relatório
      await handleGenerateReport(examName);
      
      // Limpar os arquivos selecionados
      setAnswerFiles([]);
    } catch (err) {
      setError('Erro ao fazer upload das respostas. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateReport = async (examName: string) => {
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('exam_name', examName);

      const response = await fetch('http://localhost:8000/generate_report', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro ao gerar relatório');
      }

      const data = await response.json();

      // Buscar o relatório gerado
      const reportResponse = await fetch('http://localhost:8000/get_report', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!reportResponse.ok) {
        const errorData = await reportResponse.json();
        throw new Error(errorData.detail || 'Erro ao buscar relatório');
      }

      const reportData = await reportResponse.json();

      // Atualizar o exame mantendo os relatórios anteriores
      setExams(exams.map(exam => {
        if (exam.name === examName) {
          const currentReport = exam.report || {};
          const newReport = reportData.report || {};
          return {
            ...exam,
            processed: true,
            report: { ...currentReport, ...newReport }
          };
        }
        return exam;
      }));

      setSelectedExam(examName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (examName: string) => {
    try {
      const formData = new FormData();
      formData.append('exam_name', examName);

      const response = await fetch('http://localhost:8000/download_report', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${examName}_report.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
      setError('Erro ao baixar relatório. Tente novamente.');
    }
  };

  return (
    <>
      <Head>
        <title>Exames - Bubble Sheet Checker</title>
      </Head>

        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Exames</h1>
            <button
              onClick={() => router.push('/create')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Criar Novo Exame
            </button>
          </div>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : exams.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum exame encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">Comece criando um novo exame.</p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/create')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Criar Exame
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => (
                <div
                  key={exam.name}
                className="bg-white overflow-hidden shadow rounded-lg"
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900">{exam.name}</h3>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-4">
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
                                htmlFor={`answer-files-${exam.name}`}
                                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                              >
                                <span>Upload das respostas</span>
                                <input
                                  id={`answer-files-${exam.name}`}
                                  name="answer-files"
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="sr-only"
                                  onChange={handleFileChange}
                                />
                              </label>
                              <p className="pl-1">ou arraste e solte</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG até 10MB</p>
                          </div>
                        </div>
                    </div>
                      <button
                        onClick={() => handleUploadAnswers(exam.name)}
                        disabled={uploading || answerFiles.length === 0}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {uploading ? 'Enviando...' : 'Enviar e Verificar'}
                      </button>
                    </div>

                    {exam.processed && exam.report && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-500">Resultados:</h4>
                        {Object.entries(exam.report).map(([filename, data]) => (
                          <div key={filename} className="text-sm border-b border-gray-200 pb-2">
                            <p className="font-medium text-gray-900">{filename}</p>
                            <p className="text-gray-500">Pontuação: {data.score}</p>
                            <div className="mt-1">
                              <p className="text-xs text-gray-500">Respostas:</p>
                              <div className="grid grid-cols-5 gap-1 mt-1">
                                {Object.entries(data.choices).map(([question, answer]) => {
                                  const correctAnswer = data.correct_answers?.[question];
                                  const isCorrect = correctAnswer ? answer === correctAnswer : false;
                                  return (
                                    <div 
                                      key={question} 
                                      className={`text-xs p-1 rounded ${
                                        isCorrect 
                                          ? 'bg-green-50 text-green-700 border border-green-200' 
                                          : 'bg-red-50 text-red-700 border border-red-200'
                                      }`}
                                    >
                                      <span className="font-medium">{question}:</span> {answer}
                                      {!isCorrect && correctAnswer && (
                                        <span className="ml-1 text-xs text-gray-500">
                                          (Correta: {correctAnswer})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      <button
                        onClick={() => handleDownloadReport(exam.name)}
                          className="w-full mt-4 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                          Baixar Relatório
                      </button>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </>
  );
}
