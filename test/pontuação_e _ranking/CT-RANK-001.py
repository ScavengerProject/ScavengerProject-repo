from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import os
import sys

# IMPORTA VARIÁVEIS DO CONFIG
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, RAIZ)

from test.config import (
    URL_LOGIN,
    TIMEOUT_MAXIMO,
    DIRETORIO_BASE_SCREENSHOTS,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    EMAIL_GABRIELA,
    SENHA_ADMIN,
    caminho_screenshot
)

# ARQUIVO DE FALHA
NOME_ARQUIVO_FALHA = "falha_ct_rank_001.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print("Iniciando Teste CT-RANK-001 (Exibição Correta do Ranking)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()
    navegador.get(URL_LOGIN)

    # LOGIN GABRIELA (Equipe Alfa)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)

    # Marca o tempo antes do clique para medir tempo de resposta
    tempo_inicio = time.time()

    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()

    # MEDIÇÃO DO TEMPO DE RESPOSTA PARA CARREGAR O RANKING
    seletor_posicao_alfa = "(//span[@class='font-bold text-lg text-yellow-600'])[1]"
    wait.until(EC.visibility_of_element_located((By.XPATH, seletor_posicao_alfa)))

    tempo_final = time.time()
    tempo_resposta = tempo_final - tempo_inicio

    print(f"\nTempo de resposta medido: {tempo_resposta:.2f} segundos")

    if tempo_resposta > 3:
        raise AssertionError(
            f"Tempo de resposta acima do permitido. Obtido: {tempo_resposta:.2f}s (Máx permitido: 3s)"
        )

    # VERIFICAÇÃO DA EQUIPE ALFA (1º lugar)
    seletor_nome_alfa = "(//p[normalize-space()='Alfa'])[1]" 
    posicao_alfa = navegador.find_element(By.XPATH, seletor_posicao_alfa).text
    nome_alfa = navegador.find_element(By.XPATH, seletor_nome_alfa).text

    print(f"\nEquipe Alfa Encontrada:")
    print(f"- Posição: {posicao_alfa}")
    print(f"- Nome: {nome_alfa}")

    if posicao_alfa != "1º":
        raise AssertionError("Equipe Alfa não está em 1º lugar.")

    if nome_alfa.lower() != "alfa":
        raise AssertionError("Nome da equipe Alfa incorreto no ranking.")

    # VERIFICAÇÃO DA EQUIPE BETA (2º lugar)
    seletor_posicao_beta = "(//span[@class='font-bold text-lg text-gray-900'])[1]"
    seletor_nome_beta = "(//p[normalize-space()='Beta'])[1]"

    posicao_beta = navegador.find_element(By.XPATH, seletor_posicao_beta).text
    nome_beta = navegador.find_element(By.XPATH, seletor_nome_beta).text

    print(f"\nEquipe Beta Encontrada:")
    print(f"- Posição: {posicao_beta}")
    print(f"- Nome: {nome_beta}")

    if posicao_beta != "2º":
        raise AssertionError("Equipe Beta não está em 2º lugar.")

    if nome_beta.lower() != "beta":
        raise AssertionError("Nome da equipe Beta incorreto no ranking.")

    # sucesso
    print("\n RESULTADO DO TESTE")
    print("✅ SUCESSO — Ranking exibido corretamente e tempo de resposta dentro do limite.")

except Exception as e:
    print("\n RESULTADO DO TESTE")
    print("❌ FALHOU")
    print(f"Erro: {e}")

    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    time.sleep(3)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")