from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException
import time
import os
import sys
import re

# IMPORTA VARIÁVEIS DO CONFIG
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, RAIZ)

from test.config import (
    URL_LOGIN,
    URL_PAINEL_ADMIN,
    TIMEOUT_MAXIMO,
    DIRETORIO_BASE_SCREENSHOTS,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    EMAIL_ADMIN,    
    SENHA_ADMIN,
    EMAIL_GABRIELA,
    BOTAO_LOGOUT,
    caminho_screenshot
)
# VARIÁVEIS LOCAIS
BOTAO_GERENCIAR_PENALIDADES_TEXTO = "//p[normalize-space()='Gerenciar Penalidades']"
SELETOR_PONTUACAO_ALFA = "div[class='flex items-center justify-between p-3 sm:p-4 rounded-lg border gap-2 bg-yellow-50 border-yellow-200'] p[class='text-xs sm:text-sm text-gray-600']"
BOTAO_CRIAR_PENALIDADE = "/html[1]/body[1]/div[1]/div[1]/div[1]/main[1]/div[1]/div[1]/button[1]"
DROPDOWN_EQUIPE = "body > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > main:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > button:nth-child(2)"
CAMPO_VALOR_PONTOS = "input[value='0']"
CAMPO_MOTIVO = "//textarea"
BOTAO_CONFIRMAR = "//button[@class='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 touch-manipulation active:bg-blue-800 h-10 px-4 py-2 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white']"
BOTAO_VOLTAR_RANKING = "//p[normalize-space()='Central de Informações']"
BOTAO_NOTIFICACOES = "//button[@class='justify-center whitespace-nowrap ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 touch-manipulation active:bg-blue-800 h-10 text-sm sm:text-base relative flex items-center gap-1 sm:gap-2 bg-white hover:bg-gray-50 text-gray-700 px-2 sm:px-3 md:px-4 py-2 rounded-lg transition font-semibold shadow-md hover:shadow-lg border border-gray-200']"
BOTAO_PENALIDADES_EQUIPE = "//p[normalize-space()='Penalidades da Equipe']"
PRIMEIRA_LINHA_TABELA = "//tbody/tr[1]"

# --- CONFIGURAÇÃO DO TESTE ---
NOME_ARQUIVO_FALHA = "falha_ct_funcs_001.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)
MOTIVO_PENALIDADE = "Atraso na Entrega"
VALOR_PENALIDADE = "10"

def obter_pontuacao_alfa(driver):
    time.sleep(2)
    try:
        xpath_pontos_exatos = "//p[normalize-space()='Alfa']/following-sibling::p"
        
        elemento_pontos = driver.find_element(By.XPATH, xpath_pontos_exatos)
        texto = elemento_pontos.text
        
        numeros = re.findall(r'-?\d+', texto)
        
        if numeros:
            pontos = int(numeros[0])
            return pontos
        else:
            return None
            
    except Exception as e:
        print(f"   ❌ Falha ao ler pontuação (Elemento não encontrado ou mudou): {e}")
        return None

print("Iniciando Teste CT-FUNCS-001 (Aplicação de Penalidade)...")

# --- INÍCIO DO TESTE ---
try:
    # Cria diretório de screenshots se não existir
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)

    navegador = webdriver.Chrome()
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    navegador.maximize_window()

    # ==========================================
    # PARTE 1: ADMIN APLICA PENALIDADE
    # ==========================================

    # 1. LOGIN
    navegador.get(URL_LOGIN)
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()

    wait.until(EC.url_contains(URL_PAINEL_ADMIN))
    
    # 2. CAPTURAR PONTUAÇÃO INICIAL DA EQUIPE ALFA
    pontuacao_inicial = obter_pontuacao_alfa(navegador)
    
    if pontuacao_inicial is None:
        raise Exception("Abortando: Equipe Alfa não localizada no início do teste.")

    # 3. CLICAR EM "GERENCIAR PENALIDADES"
    wait.until(EC.element_to_be_clickable(
        (By.XPATH, BOTAO_GERENCIAR_PENALIDADES_TEXTO)
    )).click()
    time.sleep(3)
    
    # 4. ABRIR FORMULÁRIO DE PENALIDADE
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_CRIAR_PENALIDADE))).click()

    # 5. PREENCHER O FORMULÁRO
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, DROPDOWN_EQUIPE))).click()
    wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Alfa')] | //span[contains(text(), 'Alfa')]"))).click()
    campo_pontos = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, CAMPO_VALOR_PONTOS)))
    
    campo_pontos.send_keys(Keys.CONTROL + "a") # Seleciona tudo
    campo_pontos.send_keys(Keys.DELETE)        # Deleta
    campo_pontos.send_keys(VALOR_PENALIDADE)              # Digita

    campo_motivo = navegador.find_element(By.XPATH, CAMPO_MOTIVO)
    campo_motivo.send_keys(MOTIVO_PENALIDADE)

    # 6. CONFIRMAR
    time.sleep(2)
    navegador.find_element(By.XPATH, BOTAO_CONFIRMAR).click()

    # --- TRATAMENTO DE ALERTA ---
    try:
        # Espera até 5 segundos pelo alerta aparecer
        wait.until(EC.alert_is_present())
        alerta = navegador.switch_to.alert        
        alerta.accept()
        wait.until(EC.alert_is_present())
        alerta = navegador.switch_to.alert        
        alerta.accept()

    except TimeoutException:
        print("Nenhum alerta apareceu")

    # 7. VOLTAR PARA O RANKING (PAINEL GERAL)
    time.sleep(3)
    navegador.find_element(By.XPATH, BOTAO_VOLTAR_RANKING).click()
    
    time.sleep(3) # Espera carregar a nova pontuação

    # 8. CAPTURAR PONTUAÇÃO FINAL E VALIDAR
    pontuacao_final = obter_pontuacao_alfa(navegador)
    
    print(f"\n--- RESUMO ---")
    print(f"Pontos Iniciais: {pontuacao_inicial}")
    print(f"Pontos Finais:   {pontuacao_final}")
    print(f"Esperado:        {pontuacao_inicial - 10}")

    if pontuacao_final == (pontuacao_inicial - 10):
        print("A pontuação foi atualizada corretamente (-10 pontos).")
        
    else:
        print("A pontuação não foi descontada corretamente.")
        raise AssertionError(f"Esperava {pontuacao_inicial - 10}, mas encontrou {pontuacao_final}")
    
    # ==========================================
    # PARTE 2: VERIFICAÇÃO DO COORDENADOR
    # ==========================================
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_LOGOUT))).click()
    wait.until(EC.visibility_of_element_located((By.ID, CAMPO_EMAIL)))

    # Login Coordenador
    print(f"Logando como: {EMAIL_GABRIELA}")
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_GABRIELA)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    
    time.sleep(4) 

    # VERIFICAÇÃO DA PENALIDADE
    # 1. Clica no menu lateral
    wait.until(EC.element_to_be_clickable((By.XPATH, BOTAO_PENALIDADES_EQUIPE))).click()
    time.sleep(3)
        
    primeira_linha = wait.until(EC.visibility_of_element_located((By.XPATH, PRIMEIRA_LINHA_TABELA)))
    texto_linha = primeira_linha.text

    erro_msg = []
    if MOTIVO_PENALIDADE not in texto_linha:
        erro_msg.append("Motivo incorreto")
    if VALOR_PENALIDADE not in texto_linha:
        erro_msg.append("Valor incorreto")
    
    if not erro_msg:
        print(f"A penalidade '{MOTIVO_PENALIDADE}' valor '{VALOR_PENALIDADE}' está no topo da lista.")
    else:
        print(f"A linha não contêm os dados esperados. Falhas: {erro_msg}")
        navegador.save_screenshot(caminho_screenshot(CAMINHO_COMPLETO_FALHA))
        raise AssertionError(f"Dados divergentes na tabela: {texto_linha}")
    
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
    print("Teste de penalidade finalizado.")