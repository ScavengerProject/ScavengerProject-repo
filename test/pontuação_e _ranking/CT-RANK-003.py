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
    EMAIL_ADMIN,
    SENHA_ADMIN,
    GERENCIAR_PROVAS_BOTAO,
    URL_RESTRITA_ADMIN,
    COMPONENTE_NO_GER_PROVAS,
    caminho_screenshot
)

# ARQUIVO PARA PRINT DE ERRO
NOME_ARQUIVO_FALHA = "falha_ct_rank_003.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)

print("Iniciando Teste CT-RANK-003 (Ocultar Pontuação de Prova Específica)...")

try:
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()
    navegador.get(URL_LOGIN)

    # LOGIN ADMINISTRADOR
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    print("Login realizado com sucesso como Administrador.")

    # CLICA NO "GERENCIAR PROVAS" E ENTRA NA PÁGINA
    wait.until(EC.element_to_be_clickable((By.XPATH, GERENCIAR_PROVAS_BOTAO))).click()
    wait.until(EC.url_contains(URL_RESTRITA_ADMIN))
    print("Página acessada com sucesso:", navegador.current_url)
    wait.until(EC.element_to_be_clickable((By.XPATH, COMPONENTE_NO_GER_PROVAS))).click()  # Garante que está na página pro scroll

    # ROLAR ATÉ O FINAL DA PÁGINA
    navegador.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    print("Scroll até o final da página executado.")

    # CLICA NO BOTÃO TROFÉU PARA EDITAR INFO SOBRE A PONTUAÇÃO DA PROVA
    wait.until(EC.element_to_be_clickable((By.XPATH, "//div[5]//div[1]//div[1]//div[2]//button[1]"))).click()

    # VERIFICA SE EXISTE UM CHECK PARA MARCAR OCULTAR PONTUAÇÃO DA PROVA OU NÃO
    try:
        wait.until(EC.presence_of_element_located((By.XPATH, "(//button[@id='OCULTAR_PONTUACAO'])[1]")))
        print("✅ OK: O check de ocultar pontuação EXISTE.")
    except:
        print("❌ ERRO: Check de ocultar pontuação NÃO existe mas DEVERIA.")
        # NÃO lança erro — segue o teste normalmente

    # SALVAR MODAL PONTUAÇÃO
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[normalize-space()='Salvar Resultados'])[1]"))).click()

    # SAIR E ENTRAR COMO ALUNO  
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[@class='justify-center whitespace-nowrap text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-semibold shadow-md hover:shadow-lg'])[1]"))).click()

    # LOGIN GABRIELA (Equipe Alfa)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()

    # CLICA EM VER TODAS AS PROVAS
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//button[normalize-space()='Ver todas as provas disponíveis'])[1]"))).click()

    # CLICA NA PROVA DE TESTE PARA VER O RANKING
    wait.until(EC.element_to_be_clickable((By.XPATH, "(//div[@class='flex flex-col space-y-1.5 p-6'])[4]"))).click()

    # VERIFICA SE O CAMPO DE PONTUAÇÃO ESTÁ APARECENDO, SE TIVER, É UM ERRO
    try:
        # tenta encontrar o texto "50 pontos" e se aparece, o wait termina e da o erro
        wait.until(EC.presence_of_element_located((By.XPATH,"(//span[contains(normalize-space(.), '50 pontos')])[1]")))
        raise AssertionError("❌ ERRO FINAL: Pontos ESTÃO aparecendo para o aluno mas eles DEVERIAM estar ocultados.")
    except TimeoutException:
        print("✅ OK FINAL: Pontos NÃO aparecem para o aluno, comportamento correto, significa que ocultou os pontos.")


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