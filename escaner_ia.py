import cv2
import easyocr
import sys

def escanear():
    try:
        # Iniciamos el lector sin logs en consola
        lector = easyocr.Reader(['en', 'es'], verbose=False)
        
        # OJO: 0 es la cámara por defecto. Si tu microscopio no da video, cámbialo a 1 o 2.
        cap = cv2.VideoCapture(0) 
        ret, frame = cap.read()
        cap.release() # Apagamos la cámara apenas toma la foto

        if not ret:
            print("ERROR:NO_CAMARA")
            sys.exit(1)

        # EasyOCR lee la foto
        resultados = lector.readtext(frame)
        
        if len(resultados) > 0:
            textos = [res[1] for res in resultados]
            codigo = "".join(textos).replace(" ", "")
            # Imprimimos el resultado para que Node.js lo atrape
            print(f"EXITO:{codigo}")
        else:
            print("ERROR:SIN_TEXTO")

    except Exception as e:
        print(f"ERROR:Fallo interno en Python")

if __name__ == '__main__':
    escanear()