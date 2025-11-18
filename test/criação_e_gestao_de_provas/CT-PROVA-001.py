from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import os

# VARIÁVEIS DE CONFIGURAÇÃO
DIRETORIO_DO_SCRIPT = os.path.dirname(__file__)
URL_LOGIN = "http://localhost:5173/login" 
URL_PROVAS = "http://localhost:5173/admin/provas" 
NOME_DA_PROVA = "Prova Teste CT-SEC-004"
TIMEOUT_MAXIMO = 10
TEMPO_LIMITE_RESPOSTA = 3 
TEXTO_POPUP_ESPERADO = "Prova criada com sucesso" 

# CONFIGURAÇÃO DE SCREENSHOTS
DIRETORIO_BASE_SCREENSHOTS = os.path.join(DIRETORIO_DO_SCRIPT, "screenshots")
NOME_ARQUIVO_FALHA = "falha_ct_prova_004.png"
NOME_ARQUIVO_SUCESSO = "sucesso_ct_sec_004.png"
CAMINHO_COMPLETO_FALHA = os.path.join(DIRETORIO_BASE_SCREENSHOTS, NOME_ARQUIVO_FALHA)
CAMINHO_COMPLETO_SUCESSO = os.path.join(DIRETORIO_BASE_SCREENSHOTS, NOME_ARQUIVO_SUCESSO)

# INÍCIO DO TESTE CT-SEC-004
print("Iniciando Teste CT-SEC-004 (Criação de Prova)...")

try:
    # Cria o diretório de screenshots se não existir
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)
        print(f"Diretório criado: {DIRETORIO_BASE_SCREENSHOTS}")
        
    navegador = webdriver.Chrome()
    navegador.maximize_window()
    navegador.get(URL_LOGIN)
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    
    # --- LOGIN ---
    print("Executando pré-condição: Login como Admin...")
    wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys("admin@gincana.com")
    navegador.find_element(By.ID, "senha").send_keys("admin123")
    navegador.find_element(By.XPATH, "//button[normalize-space()='Entrar']").click()
    print("Login enviado.")

    # --- NAVEGAÇÃO ---
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Ver Provas']"))).click()
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Gerenciar Provas']"))).click() 
    
    # Aguarda o carregamento da URL da lista de provas
    wait.until(EC.url_contains(URL_PROVAS)) 
    
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Criar Nova Prova']"))).click() 
    print("Navegação para formulário de criação concluída.")

    # --- PREENCHIMENTO ---
    wait.until(EC.presence_of_element_located((By.ID, "titulo"))).send_keys(NOME_DA_PROVA)
    navegador.find_element(By.ID, "descricao").send_keys("Descrição da Prova Teste CT-SEC-004")

    # Dropdown customizado (Formato)
    trigger_dropdown = wait.until(EC.element_to_be_clickable((By.ID, "formato-dropdown"))).click()
    
    # Seleciona a opção do Questionário Online
    opcao_questionario = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[@role='presentation']//div[1]"))).click()
    print("Formato 'Questionário Online' selecionado.")

    # Datas
    campo_data_inicio = wait.until(EC.element_to_be_clickable((By.ID, "data_inicio")))
    campo_data_inicio.click()
    campo_data_inicio.clear()
    campo_data_inicio.send_keys("20112025")
    
    campo_data_termino = wait.until(EC.element_to_be_clickable((By.ID, "data_fim")))
    campo_data_termino.click()
    campo_data_termino.clear()
    campo_data_termino.send_keys("22112025")
    print("Formulário preenchido.")

    # --- AÇÃO PRINCIPAL E TEMPO ---
    print("Salvando prova e iniciando medição de tempo...")
    
    # Inicia a contagem de tempo
    start_time = time.time()
    
    botao_salvar = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Criar Prova']"))).click()

    # ######################################################################
    # ##### INÍCIO DA VERIFICAÇÃO DE CRITÉRIOS #####
    # ######################################################################
    
    print("Aguardando resposta do servidor e verificando critérios...")

    # CRITÉRIO 1: Verifica o redirecionamento para a lista de provas
    wait.until(EC.url_contains(URL_PROVAS)) 
    
    # CRITÉRIO 2: Verifica o Pop-up de sucesso
    xpath_popup = f"//*[contains(text(), '{TEXTO_POPUP_ESPERADO}')]"
    pop_up_sucesso = wait.until(EC.visibility_of_element_located((By.XPATH, xpath_popup)))
    
    # Mede o Tempo de Resposta
    end_time = time.time()
    tempo_resposta = end_time - start_time
    
    # CRITÉRIO 3: Verifica se o item aparece na lista
    xpath_nome_prova = f"//*[normalize-space()='{NOME_DA_PROVA}']"
    item_na_lista = wait.until(EC.visibility_of_element_located((By.XPATH, xpath_nome_prova)))

    # --- RESULTADOS ---
    print("\n RESULTADO DO TESTE")
    
    # Confirmação dos Critérios
    print(" SUCESSO")
    print(f"Critério 1 (Redirecionamento): URL atual é '{navegador.current_url}' (OK)")
    print(f"Critério 2 (Pop-up Sucesso): Pop-up visível com texto '{TEXTO_POPUP_ESPERADO}' (OK)")
    print(f"Critério 3 (Item na Lista): Prova '{NOME_DA_PROVA}' encontrada na lista (OK)")
    
    navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
    print(f"Screenshot de SUCESSO salvo em: {CAMINHO_COMPLETO_SUCESSO}")

    # VERIFICAÇÃO DO TEMPO DE RESPOSTA
    print(f"Tempo de Resposta (Criação): {tempo_resposta:.2f} segundos")
    
    if tempo_resposta <= TEMPO_LIMITE_RESPOSTA:
        print(f"Critério 4 (Tempo de Resposta <= {TEMPO_LIMITE_RESPOSTA}s):  APROVADO")
    else:
        print(f"Critério 4 (Tempo de Resposta <= {TEMPO_LIMITE_RESPOSTA}s):  FALHOU. Tempo excedido.")

except Exception as e:
    # --- TRATAMENTO DE ERRO ---
    print("\n RESULTADO DO TESTE")
    print(f" FALHOU")
    
    # Tenta identificar o erro mais comum
    if isinstance(e, TimeoutException):
        print("Erro: Timeout. Um elemento esperado não apareceu a tempo.")
    else:
        print(f"Erro inesperado durante a execução do teste: {e}")

    if 'navegador' in locals() and navegador:
        navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
        print(f"Screenshot de FALHA salvo em: {CAMINHO_COMPLETO_FALHA}")

finally:
    # Tempo para visualização antes de fechar o navegador
    time.sleep(3)
    if 'navegador' in locals() and navegador:
        navegador.quit()
    print("Teste finalizado.")