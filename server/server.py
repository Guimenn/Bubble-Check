from typing import Union
import cv2
import os
import json
import traceback

from omr import OMR, getScores

from fastapi import FastAPI, File, UploadFile, Request, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI()

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos HTTP
    allow_headers=["*"],  # Permite todos os headers
)


def generateReport(exam_name):
    try:
        base_path = f"exams/{exam_name}"
        if not os.path.exists(base_path):
            raise Exception(f"Diretório do exame {exam_name} não encontrado")

        images_path = f"{base_path}/images"
        solution_path = f"{base_path}/solution"
        
        if not os.path.exists(images_path):
            raise Exception("Diretório de imagens não encontrado")
        if not os.path.exists(solution_path):
            raise Exception("Diretório de solução não encontrado")

        images = os.listdir(images_path)
        if not images:
            raise Exception("Nenhuma imagem de resposta encontrada")

        solution_files = os.listdir(solution_path)
        if not solution_files:
            raise Exception("Nenhum arquivo de gabarito encontrado")

        solution_file = solution_files[0]
        solution_full_path = f"{solution_path}/{solution_file}"
        
        # Lê o gabarito da imagem
        answer = OMR(solution_full_path)
        if not answer:
            raise Exception("Não foi possível ler o gabarito da imagem")
        
        report = {}
        csvReport = "Name,Score,Choices"
        csvReport += f"\nSolution,,{answer}"
        
        for img in images:
            try:
                choices = OMR(f'{images_path}/{img}')
                if not choices:
                    print(f"Aviso: Não foi possível ler as respostas da imagem {img}")
                    continue
                    
                score = getScores(answer, choices)
                report[img] = {
                    "score": score,
                    "choices": choices,
                    "correct_answers": answer
                }
                csvReport += f"\n{img},{score},{choices}"
            except Exception as e:
                print(f"Erro ao processar imagem {img}: {str(e)}")
                continue

        if not report:
            raise Exception("Nenhuma resposta foi processada com sucesso")

        with open(f"{base_path}/report.json", "w") as f:
            json.dump(report, f, indent=4)

        with open(f"{base_path}/report.csv", "w") as f:
            f.write(csvReport)

        return True
    except Exception as e:
        print(f"Erro ao gerar relatório: {str(e)}")
        print(traceback.format_exc())
        raise e


@app.post("/upload_multiple_images")
async def upload_multiple_images(exam_name: str = Form(...), files: list = File(...)):
    for file in files:
        contents = await file.read()
        with open(f"exams/{exam_name}/images/{file.filename}", "wb") as f:
            f.write(contents)
    return {"success": "Images uploaded"}


@app.post("/upload_solution")
async def upload_solution(exam_name: str = Form(...), file: UploadFile = File(...)):
    # delete existing solution
    solutionFile = os.listdir(f"exams/{exam_name}/solution")
    if len(solutionFile) > 0:
        os.remove(f"exams/{exam_name}/solution/{solutionFile[0]}")

    contents = await file.read()
    with open(f"exams/{exam_name}/solution/{file.filename}", "wb") as f:
        f.write(contents)
    
    # Lê e retorna o gabarito para confirmação
    solution_path = f"exams/{exam_name}/solution/{file.filename}"
    answer = OMR(solution_path)
    
    return {
        "success": "Solution uploaded",
        "answer_key": answer
    }


@app.post("/create_exam")
async def create_exam(exam_name: Request):
    exam_name = await exam_name.json()
    exam_name = exam_name["exam_name"]
    if not os.path.exists("exams"):
        os.mkdir("exams")

    if not os.path.exists(f"exams/{exam_name}"):
        os.mkdir(f"exams/{exam_name}") 
        os.mkdir(f"exams/{exam_name}/images")
        os.mkdir(f"exams/{exam_name}/solution")
    else:
        return {"error": "Exam already exists"}

    return {"success": "Exam created"}

@app.get("/get_exams")
async def get_exam():
    if not os.path.exists("exams"):
        os.mkdir("exams")
    return {"exams": os.listdir("exams")}

@app.post("/get_exam")
async def get_exam(exam_name: str = Form(...)):
    if not os.path.exists(f"exams/{exam_name}"):
        return {"error": "Exam does not exist"}
    else:
        images = os.listdir(f"exams/{exam_name}/images")
        solution = os.listdir(f"exams/{exam_name}/solution")
    
        return {"images": images, "solution": solution}


@app.post("/generate_report")
async def generate_report(exam_name: str = Form(...)):
    try:
        if not os.path.exists(f"exams/{exam_name}"):
            raise HTTPException(status_code=404, detail="Exame não encontrado")
        
        generateReport(exam_name)
        return JSONResponse(content={"success": "Relatório gerado com sucesso"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_report")
async def get_report(exam_name: str = Form(...)):
    if not os.path.exists(f"exams/{exam_name}"):
        return {"error": "Exam does not exist"}
    else:
        with open(f"exams/{exam_name}/report.json", "r") as f:
            report = json.load(f)
        return {"report": report}

@app.get("/exam/{exam_name}/{image_name}")
async def get_exam_image(exam_name: str, image_name: str):
    return FileResponse(f"exams/{exam_name}/images/{image_name}")

@app.post("/download_report")
async def download_report(exam_name: str = Form(...)):
    if not os.path.exists(f"exams/{exam_name}"):
        return {"error": "Exam does not exist"}
    else:
        return FileResponse(f"exams/{exam_name}/report.csv")