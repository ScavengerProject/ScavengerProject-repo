from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import os
import sys

# Configurar encoding UTF-8 para evitar erros com caracteres especiais no Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# IMPORTAR CONFIGURAÇÕES
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import (
    URL_LOGIN,
    URL_PAINEL_ADMIN,
    TIMEOUT_MAXIMO,
    TEMPO_LIMITE_RESPOSTA,
    DIRETORIO_BASE_SCREENSHOTS,
    CAMPO_EMAIL,
    CAMPO_SENHA,
    BOTAO_LOGIN,
    TOAST,
    EMAIL_ADMIN,
    SENHA_ADMIN,
    EMAIL_GABRIELA,
    caminho_screenshot
)

# CONFIGURAÇÃO DE SCREENSHOTS
NOME_ARQUIVO_FALHA = "falha_ct_equipe_003.png"
NOME_ARQUIVO_SUCESSO = "sucesso_ct_equipe_003.png"
CAMINHO_COMPLETO_FALHA = caminho_screenshot(NOME_ARQUIVO_FALHA)
CAMINHO_COMPLETO_SUCESSO = caminho_screenshot(NOME_ARQUIVO_SUCESSO)

# URL E VARIÁVEIS DO TESTE
URL_ADMIN_EMPRESTIMOS = "http://localhost:5173/admin/emprestimos"
NOME_EQUIPE_BETA = "Beta"
NOME_PARTICIPANTE_X = "Aluno Méedio 3"  # Participante que será emprestado
MENSAGEM_TOAST_EMPRESTIMO_ESPERADA = "Empréstimo criado com sucesso"

print("Iniciando Teste CT-EQUIPE-003 (Criação de Empréstimo pelo Administrador)...")

try:
    # Cria o diretório de screenshots se não existir
    if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
        os.makedirs(DIRETORIO_BASE_SCREENSHOTS)
        print(f"Diretório criado: {DIRETORIO_BASE_SCREENSHOTS}")

    navegador = webdriver.Chrome()
    navegador.maximize_window()
    navegador.get(URL_LOGIN)
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)

    # --- PASSO 1: LOGIN COMO ADMINISTRADOR ---
    print("Executando Passo 1: Login como Administrador...")
    wait.until(EC.presence_of_element_located((By.ID, CAMPO_EMAIL))).send_keys(EMAIL_ADMIN)
    time.sleep(1)
    navegador.find_element(By.ID, CAMPO_SENHA).send_keys(SENHA_ADMIN)
    time.sleep(1)
    navegador.find_element(By.XPATH, BOTAO_LOGIN).click()
    print("Login enviado.")

    # Aguarda o redirecionamento após login
    time.sleep(2)
    wait.until(EC.url_contains(URL_PAINEL_ADMIN))
    print("Login realizado com sucesso.")

    # --- PASSO 2: VER EMPRÉSTIMOS ATIVOS ---
    print("\nExecutando Passo 2: Acessar página de Empréstimos Ativos...")
    navegador.get(URL_ADMIN_EMPRESTIMOS)
    
    # Aguarda o carregamento da página
    wait.until(EC.url_contains(URL_ADMIN_EMPRESTIMOS))
    time.sleep(2)

    # --- PASSO 3: NOVO EMPRÉSTIMO ---
    print("\nExecutando Passo 3: Clicar em 'Novo Empréstimo'...")
    
    # Clica no botão "Novo Empréstimo"
    botao_novo_emprestimo = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Novo Empréstimo')]")))
    botao_novo_emprestimo.click()
    print("Botão 'Novo Empréstimo' clicado.")
    

    # --- PASSO 4: PREENCHER O FORMULÁRIO DE EMPRÉSTIMO ---
    print("\nExecutando Passo 4: Preencher formulário de empréstimo...")
    
    # Inicia a contagem de tempo antes do preenchimento
    start_time = time.time()
    
    # 4.1 - Selecionar Aluno (Participante X)
    print(f"Selecionando aluno: '{NOME_PARTICIPANTE_X}'...")
    select_aluno = wait.until(EC.element_to_be_clickable((By.ID, "selectAlunoEmprestimo")))
    select_aluno.click()
    time.sleep(1)
    
    # Aguarda as opções carregarem e seleciona o participante
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[@role='option']")))
    time.sleep(1)
    
    try:
        opcao_aluno = wait.until(EC.element_to_be_clickable((By.XPATH, f"//*[@role='option' and contains(normalize-space(), '{NOME_PARTICIPANTE_X}')]")))
        opcao_aluno.click()
        print(f"Aluno '{NOME_PARTICIPANTE_X}' selecionado.")
    except TimeoutException:
        # Se não encontrar pelo nome exato, seleciona o primeiro disponível
        opcao_aluno = wait.until(EC.element_to_be_clickable((By.XPATH, "(//*[@role='option'])[1]")))
        nome_aluno_selecionado = opcao_aluno.text
        opcao_aluno.click()
        print(f"Aluno selecionado: '{nome_aluno_selecionado}' (busca parcial por '{NOME_PARTICIPANTE_X}')")
    time.sleep(1)

    # 4.2 - Selecionar Equipe Destino (Equipe Beta)
    print(f"Selecionando equipe destino: '{NOME_EQUIPE_BETA}'...")
    select_equipe = wait.until(EC.element_to_be_clickable((By.ID, "selectEquipeDestinoEmprestimo")))
    select_equipe.click()
    time.sleep(1)
    
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[@role='option']")))
    time.sleep(1)
    
    try:
        opcao_equipe = wait.until(EC.element_to_be_clickable((By.XPATH, f"//*[@role='option' and contains(normalize-space(), '{NOME_EQUIPE_BETA}')]")))
        opcao_equipe.click()
        print(f"Equipe destino '{NOME_EQUIPE_BETA}' selecionada.")
    except TimeoutException:
        # Se não encontrar Beta, seleciona a segunda equipe disponível (assumindo que Alfa é a primeira)
        opcoes_equipe = navegador.find_elements(By.XPATH, "//*[@role='option']")
        if len(opcoes_equipe) > 1:
            opcoes_equipe[1].click()
            print(f"Segunda equipe disponível selecionada como destino.")
        else:
            raise AssertionError("Não há equipes suficientes para realizar o empréstimo")
    time.sleep(1)

    # 4.3 - Selecionar Prova
    print("Selecionando prova...")
    select_prova = wait.until(EC.element_to_be_clickable((By.ID, "selectProvaEmprestimo")))
    select_prova.click()
    time.sleep(1)
    
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[@role='option']")))
    time.sleep(1)
    
    # Seleciona a primeira prova disponível
    primeira_prova = wait.until(EC.element_to_be_clickable((By.XPATH, "(//*[@role='option'])[1]")))
    nome_prova = primeira_prova.text
    primeira_prova.click()
    print(f"Prova selecionada: '{nome_prova}'")
    time.sleep(1)

    # 4.4 - Clicar em "Criar Empréstimo"
    print("Criando empréstimo...")
    botao_criar = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Criar Empréstimo')]")))
    botao_criar.click()
    print("Botão 'Criar Empréstimo' clicado.")
    time.sleep(2)

    # --- PASSO 5: VERIFICAR SE O EMPRÉSTIMO FOI BEM SUCEDIDO ---
    print("\nExecutando Passo 5: Verificar se o empréstimo foi bem sucedido...")
    
    # Verifica o toast (sucesso ou erro)
    try:
        toast_element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, TOAST)))
        mensagem_toast = wait.until(lambda driver: toast_element.text.strip() if toast_element.text.strip() != "" else False)
        
        print(f"Toast recebido: '{mensagem_toast}'")

        # Verifica se é um toast de sucesso
        if MENSAGEM_TOAST_EMPRESTIMO_ESPERADA.lower() in mensagem_toast.lower():
            print(f"Critério 1 (Toast de Sucesso): OK - mensagem exibida: '{mensagem_toast}'")
        # Verifica se é um erro específico de equipe destino não encontrada
        elif "equipe destino" in mensagem_toast.lower() and ("não encontrada" in mensagem_toast.lower() or "gincana" in mensagem_toast.lower()):
            raise AssertionError(
                f"Critério 1 (Toast de Sucesso): FALHOU - Erro detectado: '{mensagem_toast}'. "
                f"O empréstimo não pode ser criado porque a equipe destino não está associada à gincana atual."
            )
        # Outros erros
        else:
            raise AssertionError(
                f"Critério 1 (Toast de Sucesso): FALHOU - esperado '{MENSAGEM_TOAST_EMPRESTIMO_ESPERADA}', recebido '{mensagem_toast}'"
            )
    except TimeoutException:
        raise AssertionError("Critério 1 (Toast de Sucesso): FALHOU - Toast não encontrado")

    # Mede o Tempo de Resposta
    end_time = time.time()
    tempo_resposta = end_time - start_time

    # Aguarda o diálogo fechar e a lista atualizar
    time.sleep(3)

    # --- PASSO 6: VERIFICAR SE O CARD DE EMPRÉSTIMO APARECE NA LISTA ---
    print("\nExecutando Passo 6: Verificar se o card de empréstimo aparece na lista...")
    
    # Aguarda a lista de empréstimos carregar/atualizar
    try:
        # Verifica se há cards de empréstimo na lista (busca por CardContent ou pela estrutura do card)
        wait.until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'shadow-md')]//p[contains(@class, 'font-semibold')]")))
        time.sleep(2)  # Aguarda um pouco mais para garantir que a lista foi atualizada
        
        # Busca pelo card que contém o nome do participante
        # O nome está em um <p> com classe "font-semibold text-gray-900"
        card_emprestimo = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, f"//p[contains(@class, 'font-semibold') and contains(text(), '{NOME_PARTICIPANTE_X}')]/ancestor::div[contains(@class, 'shadow-md')]")
            )
        )
        
        # Verifica se o card contém as informações esperadas
        texto_card = card_emprestimo.text
        
        # Trata caracteres especiais para evitar erros de encoding
        texto_card_safe = texto_card.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
        
        # Verifica se contém o nome do participante
        if NOME_PARTICIPANTE_X.lower() not in texto_card_safe.lower():
            raise AssertionError(f"Critério 2 (Card de Empréstimo): FALHOU - Nome do participante '{NOME_PARTICIPANTE_X}' não encontrado no card")
        
        # Verifica se contém a equipe destino (Beta) - pode estar no formato "Origem -> Beta"
        if NOME_EQUIPE_BETA.lower() not in texto_card_safe.lower():
            raise AssertionError(f"Critério 2 (Card de Empréstimo): FALHOU - Equipe destino '{NOME_EQUIPE_BETA}' não encontrada no card")
        
        # Verifica se contém o status ATIVO
        if "ativo" not in texto_card_safe.lower():
            raise AssertionError("Critério 2 (Card de Empréstimo): FALHOU - Status 'ATIVO' não encontrado no card")
        
        print(f"Critério 2 (Card de Empréstimo): OK - Card encontrado com participante '{NOME_PARTICIPANTE_X}' e equipe destino '{NOME_EQUIPE_BETA}'")
        # Imprime apenas os primeiros 200 caracteres, tratando encoding
        try:
            print(f"Informações do card: {texto_card_safe[:200]}...")
        except:
            print("Informações do card: [Card encontrado com sucesso]")
        
    except TimeoutException:
        raise AssertionError("Critério 2 (Card de Empréstimo): FALHOU - Card de empréstimo não encontrado na lista após criação")
    except Exception as e:
        # Trata erros de encoding ao criar mensagem de erro
        try:
            erro_msg = str(e).encode('utf-8', errors='replace').decode('utf-8', errors='replace')
            raise AssertionError(f"Critério 2 (Card de Empréstimo): FALHOU - Erro ao verificar card: {erro_msg}")
        except:
            raise AssertionError("Critério 2 (Card de Empréstimo): FALHOU - Erro ao verificar card (erro de encoding)")

    # --- RESULTADOS ---
    print("\n RESULTADO DO TESTE")
    print("SUCESSO")
    print(f"Critério 1 (Toast de Sucesso): Empréstimo criado com sucesso (OK)")
    print(f"Critério 2 (Card de Empréstimo): Card de empréstimo encontrado na lista com participante '{NOME_PARTICIPANTE_X}' e equipe destino '{NOME_EQUIPE_BETA}' (OK)")

    navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
    print(f"Screenshot de SUCESSO salvo em: {CAMINHO_COMPLETO_SUCESSO}")

    # VERIFICAÇÃO DO TEMPO DE RESPOSTA
    print(f"Tempo de Resposta (Criação de Empréstimo): {tempo_resposta:.2f} segundos")
    if tempo_resposta <= TEMPO_LIMITE_RESPOSTA:
        print(f"Critério 3 (Tempo de Resposta <= {TEMPO_LIMITE_RESPOSTA}s): APROVADO")
    else:
        print(f"Critério 3 (Tempo de Resposta <= {TEMPO_LIMITE_RESPOSTA}s): FALHOU. Tempo excedido.")

except Exception as e:
    # --- TRATAMENTO DE ERRO ---
    print("\n RESULTADO DO TESTE")
    print("FALHOU")
    
    # Tenta identificar o erro mais comum
    if isinstance(e, TimeoutException):
        print("Erro: Timeout. Um elemento esperado não apareceu a tempo.")
    elif isinstance(e, AssertionError):
        print(f"Erro de Assertion: {e}")
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
