import time
import threading
import statistics
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import os
import sys

# IMPORTAR CONFIGURAÇÕES
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import (
    URL_LOGIN,
    URL_PAINEL_PARTICIPANTE,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    EMAIL_ADMIN,
    EMAIL_GABRIELA,
    EMAIL_PEDRO,
    EMAIL_ALUNOMEDIO3,
    EMAIL_LEONARDO,
    SENHA_ADMIN,
    TEMPO_LIMITE_RESPOSTA,
    TIMEOUT_MAXIMO,
    URL_PAINEL_ADMIN
)

# LISTA COM AS CONTAS DISPONÍVEIS
EMAILS = [
    EMAIL_ADMIN,
    EMAIL_GABRIELA,
    EMAIL_PEDRO,
    EMAIL_ALUNOMEDIO3,
    EMAIL_LEONARDO
]

TOTAL_USUARIOS = 6  # Simulação de carga
resultados = []       # Armazena tempos individuais

# SIMULA UM USUÁRIO REAL
def simular_usuario(id_usuario):
    email = EMAILS[id_usuario % len(EMAILS)]  # Revezar contas automaticamente

    try:
        driver = webdriver.Chrome()  
        print(f"Acessando URL Login: {URL_LOGIN}")

        # LOGIN
        driver.get(URL_LOGIN)
        wait = WebDriverWait(driver, TIMEOUT_MAXIMO)

        wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(email)
        wait.until(EC.presence_of_element_located((By.ID, CAMPO_SENHA))).send_keys(SENHA_ADMIN)
        wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_LOGIN))).click()

        # MEDIR CARREGAMENTO DO RANKING
        inicio = time.time()
        wait.until(EC.url_contains(URL_PAINEL_ADMIN))

        # Esperar até que o ranking carregue
        wait.until(EC.visibility_of_element_located((By.XPATH,"(//div[@class='flex flex-col space-y-1.5 p-4 sm:p-6'])[2]")))

        fim = time.time()
        tempo_resposta = fim - inicio
        resultados.append(tempo_resposta)

        print(f"[Usuário {id_usuario}] Tempo de resposta: {tempo_resposta:.2f}s")

    except Exception as e:
        print(f"[Usuário {id_usuario}] ERRO: {e}")

    finally:
        driver.quit()


# EXECUTA AS THREADS (50 USUÁRIOS)
print("Iniciando Teste CT-SEC-001...")
print("Simulando 6 usuários acessando o Ranking...\n")

threads = []

for i in range(TOTAL_USUARIOS):
    t = threading.Thread(target=simular_usuario, args=(i,))
    t.start()
    threads.append(t)

# Esperar todas terminarem
for t in threads:
    t.join()


# RESULTS FINAIS
print("\n 🏁 RESULTADO FINAL")
print(f"Usuários simulados: {TOTAL_USUARIOS}")

media = statistics.mean(resultados)
maior = max(resultados)
menor = min(resultados)

print(f"Tempo médio: {media:.2f}s")
print(f"Tempo mínimo: {menor:.2f}s")
print(f"Tempo máximo: {maior:.2f}s")

if media <= TEMPO_LIMITE_RESPOSTA:
    print("✅ SUCESSO — O servidor manteve tempo médio abaixo de 3s.")
else:
    print("❌ FALHA — Tempo médio acima do limite!")
