import { useState, useRef } from 'react';

interface UploadFileProps {
  examName: string;
  type: 'solution' | 'images';
  onUploadComplete?: () => void;
}

export const UploadFile = ({ examName, type, onUploadComplete }: UploadFileProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('exam_name', examName);
      
      if (type === 'solution') {
        formData.append('file', files[0]);
        const response = await fetch('http://localhost:8000/upload_solution', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Erro ao fazer upload do gabarito');
      } else {
        files.forEach((file) => {
          formData.append('files', file);
        });
        const response = await fetch('http://localhost:8000/upload_multiple_images', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Erro ao fazer upload das imagens');
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao fazer upload. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-12 ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-300 hover:border-indigo-500'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple={type === 'images'}
        accept="image/*"
        className="hidden"
      />

      <div className="text-center">
        <svg
          className={`mx-auto h-12 w-12 ${
            isDragging ? 'text-indigo-500' : 'text-gray-400'
          }`}
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
        <div className="mt-4 flex text-sm text-gray-600">
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
          >
            <span>Clique para selecionar</span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              onChange={handleFileSelect}
              multiple={type === 'images'}
              accept="image/*"
            />
          </label>
          <p className="pl-1">ou arraste e solte</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {type === 'solution'
            ? 'PNG, JPG, GIF até 10MB'
            : 'PNG, JPG, GIF até 10MB (múltiplos arquivos permitidos)'}
        </p>
      </div>

      {isUploading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Fazendo upload...</p>
          </div>
        </div>
      )}
    </div>
  );
}; 