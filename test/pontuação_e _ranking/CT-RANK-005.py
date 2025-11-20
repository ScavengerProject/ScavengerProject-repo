from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support import expected_conditions as EC
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
    EMAIL_GABRIELA,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    SENHA_ADMIN,
    GERENCIAR_PROVAS_BOTAO,
    URL_RESTRITA_ADMIN,
    COMPONENTE_NO_GER_PROVAS,
    caminho_screenshot
)

# ARQUIVO PARA PRINT DE ERRO
NOME_ARQUIVO_FALHA = "falha_ct_rank_005.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print("Iniciando Teste CT-RANK-002 (Verificação do placar empatado)...")

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
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    print("Login realizado com sucesso como Gabriela.")

    # CLICA EM VER TODAS AS PROVAS
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[normalize-space()='Ver todas as provas disponíveis'])[1]"))).click()

    # CLICA NA PROVA ONDE TEM OS RESULTADOS DA EQUIPE BETA 
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//div[@class='flex flex-col space-y-1.5 p-6'])[2]"))).click()

    # VERIFICA SE O CAMPO DE PONTUAÇÃO ESTÁ APARECENDO, SE TIVER, É UM ERRO
    try:
        # tenta encontrar o texto "0 pontos" e se aparece, o wait termina e da o erro
        wait.until(EC.presence_of_element_located((By.XPATH,"(//span[normalize-space()='0 pontos'])[1]")))
        raise AssertionError("❌ ERRO: Pontos ESTÃO aparecendo para o aluno de outra equipe mas eles DEVERIAM estar ocultados.")
    except TimeoutException:
        print("✅ OK: Pontos NÃO aparecem para o aluno de outra equipe, comportamento correto, significa que ocultou os pontos.")


    # SUCESSO
    print("\n RESULTADO DO TESTE")
    print("✅ TESTE FINALIZADO — Todas as verificações executadas.")


except Exception as e:
    print("\n RESULTADO DO TESTE")
    print("❌ FALHOU")
    print("Erro:", e)

    if 'navegador' in locals():
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print("Screenshot salvo em:", CAMINHO_COMPLETO_FALHA)

finally:
    time.sleep(2)
    if 'navegador' in locals():
        navegador.quit()
    print("Teste finalizado.")